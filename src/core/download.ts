import { downloadFile, stopDownload } from '@/utils/fs'
import settingState from '@/store/setting/state'
import { toast } from '@/utils/tools'
import { mkdir } from '@/utils/fs'
import musicSdk from '@/utils/musicSdk'
import { toOldMusicInfo } from '@/utils'
import { getRandom } from '@/utils/common'
import { requestMsg } from '@/utils/message'
import { saveMusicUrl, getMusicUrl as getStoreMusicUrl } from '@/utils/data'
import {
  getPlayQuality,
  getOtherSource,
} from '@/core/music/utils'

const buildFileName = (musicInfo: LX.Music.MusicInfoOnline): string => {
  const format = settingState.setting['download.fileName']
  let name: string
  switch (format) {
    case '歌手 - 歌名':
      name = `${musicInfo.singer} - ${musicInfo.name}`
      break
    case '歌名':
      name = musicInfo.name
      break
    case '歌名 - 歌手':
    default:
      name = `${musicInfo.name} - ${musicInfo.singer}`
      break
  }
  name = name.replace(/[/\\:*?"<>|]/g, '_')
  return name
}

const getFileExt = (musicInfo: LX.Music.MusicInfoOnline, quality: LX.Quality): LX.Download.FileExt => {
  if (quality.includes('flac')) return 'flac'
  if (quality.includes('wav')) return 'wav'
  return 'mp3'
}

/**
 * 延时重试获取下载URL（仿照播放器的 delayRetry 模式）
 */
const delayRetry = async(musicInfo: LX.Music.MusicInfoOnline, quality: LX.Quality, isRefresh: boolean): Promise<{ url: string; quality: LX.Quality }> => {
  return new Promise<{ url: string; quality: LX.Quality }>((resolve, reject) => {
    const time = getRandom(2, 6)
    toast(global.i18n.t('player__getting_url_delay_retry', { time }))
    setTimeout(() => {
      getDownloadMusicUrl(musicInfo, quality, isRefresh, true).then(resolve).catch(reject)
    }, time * 1000)
  })
}

/**
 * 获取下载音乐URL（仿照播放器的 getMusicPlayUrl + online.ts getMusicUrl 模式）
 * 支持：音质选择、URL缓存、换源重试、限流延时重试
 */
const getDownloadMusicUrl = async(
  musicInfo: LX.Music.MusicInfoOnline,
  quality: LX.Quality,
  isRefresh: boolean = false,
  isRetryed: boolean = false,
): Promise<{ url: string; quality: LX.Quality }> => {
  const targetQuality = getPlayQuality(quality, musicInfo)

  // 先检查缓存（仿照 online.ts getMusicUrl）
  const cachedUrl = await getStoreMusicUrl(musicInfo, targetQuality)
  if (cachedUrl && !isRefresh) return { url: cachedUrl, quality: targetQuality }

  // 尝试从当前源获取URL（仿照 online.ts handleGetOnlineMusicUrl）
  let reqPromise
  try {
    reqPromise = musicSdk[musicInfo.source].getMusicUrl(toOldMusicInfo(musicInfo), targetQuality).promise
  } catch (err: any) {
    reqPromise = Promise.reject(err)
  }

  return reqPromise.then(({ url, type }: { url: string; type: LX.Quality }) => {
    void saveMusicUrl(musicInfo, type, url)
    return { url, quality: type }
  }).catch(async(err: any) => {
    console.log(err)

    // 限流时延时重试（仿照 player.ts 的 delayRetry）
    if (err.message == requestMsg.tooManyRequests) {
      return delayRetry(musicInfo, quality, isRefresh)
    }

    // 尝试换源（仿照 player.ts 的 toggle source + online.ts 的 getOtherSource）
    try {
      const otherSource = await getOtherSource(musicInfo)
      if (otherSource.length) {
        for (const sourceMusicInfo of otherSource) {
          const sourceQuality = getPlayQuality(quality, sourceMusicInfo)
          if (!sourceMusicInfo.meta._qualitys[sourceQuality]) continue

          try {
            const { url, type } = await musicSdk[sourceMusicInfo.source].getMusicUrl(
              toOldMusicInfo(sourceMusicInfo),
              sourceQuality,
            ).promise
            void saveMusicUrl(sourceMusicInfo, type, url)
            toast(global.i18n.t('toggle_source_try'))
            return { url, quality: type }
          } catch (e: any) {
            if (e.message == requestMsg.tooManyRequests) throw e
            console.log(e)
            continue
          }
        }
      }
    } catch (e: any) {
      // 换源过程中的限流重试
      if (e.message == requestMsg.tooManyRequests) {
        return delayRetry(musicInfo, quality, isRefresh)
      }
    }

    // 重试一次（仿照 player.ts getMusicPlayUrl 的 isRetryed 逻辑）
    if (!isRetryed) {
      return getDownloadMusicUrl(musicInfo, quality, isRefresh, true)
    }

    throw err
  })
}

/**
 * 下载歌曲（仿照播放器播放流程模式）
 * 流程：校验 → 获取URL（含换源重试）→ 下载文件（含进度追踪）
 */
export const downloadMusic = async(musicInfo: LX.Music.MusicInfoOnline): Promise<void> => {
  if (!settingState.setting['download.enable']) {
    toast(global.i18n.t('download_disabled_tip'))
    return
  }

  const downloadPath = settingState.setting['download.path']
  if (!downloadPath) {
    toast(global.i18n.t('download_path_not_set_tip'))
    return
  }

  const fileName = buildFileName(musicInfo)
  const quality = settingState.setting['player.playQuality']
  const ext = getFileExt(musicInfo, quality)
  const filePath = `${downloadPath}/${fileName}.${ext}`

  try {
    toast(global.i18n.t('download_start_tip', { name: musicInfo.name }))

    // 获取下载URL（仿照播放器获取播放URL的流程：含换源、重试、延时重试）
    const { url } = await getDownloadMusicUrl(musicInfo, quality, false)

    await mkdir(downloadPath)

    // 下载文件并追踪进度（仿照播放器的进度追踪模式）
    const result = await downloadFile(url, filePath, {
      begin: () => {
        toast(global.i18n.t('downloading_tip', { name: musicInfo.name }))
      },
      progress: (res: { bytesWritten: number; contentLength: number }) => {
        // 仿照播放器进度更新，可在此处扩展下载进度回调
        const progress = res.contentLength > 0 ? res.bytesWritten / res.contentLength : 0
        console.log(`Download progress: ${(progress * 100).toFixed(0)}%`)
      },
    }).promise

    if (result.statusCode === 200) {
      toast(global.i18n.t('download_success_tip', { name: musicInfo.name }))
    } else {
      toast(global.i18n.t('download_failed_tip', { name: musicInfo.name }))
    }
  } catch (err: any) {
    console.log(err)
    toast(global.i18n.t('download_failed_tip', { name: musicInfo.name }))
  }
}

/**
 * 取消下载
 */
export const cancelDownload = (jobId: number) => {
  stopDownload(jobId)
}