import { downloadFile } from '@/utils/fs'
import { getMusicUrl } from '@/core/music/online'
import settingState from '@/store/setting/state'
import { toast } from '@/utils/tools'
import { mkdir } from '@/utils/fs'

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
  // 替换文件名中的非法字符
  name = name.replace(/[/\\:*?"<>|]/g, '_')
  return name
}

const getFileExt = (musicInfo: LX.Music.MusicInfoOnline, quality: LX.Quality): string => {
  if (quality.includes('flac')) return 'flac'
  if (quality.includes('wav')) return 'wav'
  return 'mp3'
}

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
    const url = await getMusicUrl({
      musicInfo,
      isRefresh: false,
      allowToggleSource: false,
    })

    await mkdir(downloadPath)

    const result = await downloadFile(url, filePath).promise
    if (result.statusCode === 200) {
      toast(global.i18n.t('download_success_tip', { name: musicInfo.name }))
    } else {
      toast(global.i18n.t('download_failed_tip', { name: musicInfo.name }))
    }
  } catch (err: any) {
    toast(global.i18n.t('download_failed_tip', { name: musicInfo.name }))
  }
}