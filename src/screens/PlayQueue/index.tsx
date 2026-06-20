import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, TouchableOpacity, FlatList } from 'react-native'
import { pop } from '@/navigation'
import { useTheme } from '@/store/theme/hook'
import { usePlayInfo } from '@/store/player/hook'
import { useStatusbarHeight } from '@/store/common/hook'
import { useI18n } from '@/lang'
import { playList, playNext } from '@/core/player/player'
import { removeTempPlayList } from '@/core/player/tempPlayList'
import { getListMusicSync } from '@/utils/listManage'
import { createStyle } from '@/utils/tools'
import { scaleSizeH } from '@/utils/pixelRatio'
import { LIST_ITEM_HEIGHT, HEADER_HEIGHT as _HEADER_HEIGHT } from '@/config/constant'
import StatusBar from '@/components/common/StatusBar'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import Badge from '@/components/common/Badge'
import { useSettingValue } from '@/store/setting/hook'
import playerState from '@/store/player/state'
import listState from '@/store/list/state'

const HEADER_HEIGHT = scaleSizeH(_HEADER_HEIGHT)
const ITEM_HEIGHT = scaleSizeH(LIST_ITEM_HEIGHT)

type QueueItem = {
  type: 'list'
  musicInfo: LX.Music.MusicInfo
  originalIndex: number
} | {
  type: 'tempPlay'
  musicInfo: LX.Music.MusicInfo
  tempPlayIndex: number
}

interface Props {
  componentId: string
}

const ListItem = ({ item, index, isPlaying, onPress, isShowAlbumName, isShowInterval }: {
  item: QueueItem
  index: number
  isPlaying: boolean
  onPress: (item: QueueItem, index: number) => void
  isShowAlbumName: boolean
  isShowInterval: boolean
}) => {
  const theme = useTheme()
  const t = useI18n()
  const musicInfo = item.musicInfo
  const singer = `${musicInfo.singer}${isShowAlbumName && musicInfo.meta.albumName ? ` · ${musicInfo.meta.albumName}` : ''}`
  const isActive = item.type === 'list' && item.originalIndex === playerState.playInfo.playIndex && !playerState.playMusicInfo.isTempPlay
  const isTempPlayActive = item.type === 'tempPlay' && playerState.playMusicInfo.isTempPlay && playerState.playMusicInfo.musicInfo?.id === musicInfo.id

  return (
    <TouchableOpacity
      style={{ ...styles.listItem, height: ITEM_HEIGHT }}
      onPress={() => { onPress(item, index) }}
      activeOpacity={0.5}
    >
      {
        (isActive || isTempPlayActive) && isPlaying
          ? <Icon style={styles.sn} name="play-outline" size={13} color={theme['c-primary-font']} />
          : <Text style={styles.sn} size={13} color={isActive || isTempPlayActive ? theme['c-primary-font'] : theme['c-300']}>{index + 1}</Text>
      }
      <View style={styles.itemInfo}>
        <Text color={isActive || isTempPlayActive ? theme['c-primary-font'] : theme['c-font']} numberOfLines={1}>{musicInfo.name}</Text>
        <View style={styles.itemMeta}>
          {item.type === 'tempPlay' ? (
            <Badge>{t('play_later')}</Badge>
          ) : null}
          <Badge>{musicInfo.source.toUpperCase()}</Badge>
          <Text style={styles.itemMetaText} size={11} color={isActive || isTempPlayActive ? theme['c-primary-alpha-200'] : theme['c-500']} numberOfLines={1}>
            {singer}
          </Text>
        </View>
      </View>
      {
        isShowInterval ? (
          <Text size={12} color={isActive || isTempPlayActive ? theme['c-primary-alpha-400'] : theme['c-250']} numberOfLines={1}>{musicInfo.interval}</Text>
        ) : null
      }
    </TouchableOpacity>
  )
}

export default ({ componentId }: Props) => {
  const theme = useTheme()
  const t = useI18n()
  const statusBarHeight = useStatusbarHeight()
  const playInfo = usePlayInfo()
  const isShowAlbumName = useSettingValue('list.isShowAlbumName')
  const isShowInterval = useSettingValue('list.isShowInterval')
  const flatListRef = useRef<FlatList>(null)
  const [queueList, setQueueList] = useState<QueueItem[]>([])

  const listId = playInfo.playerListId

  const buildQueueList = useCallback(() => {
    if (!listId) {
      setQueueList([])
      return
    }
    const musicList = getListMusicSync(listId)
    const playIndex = playInfo.playIndex
    const tempPlayList = playerState.tempPlayList

    // 当前歌曲之前（含当前歌曲）的列表
    const beforeItems: QueueItem[] = musicList
      .slice(0, playIndex + 1)
      .map((musicInfo, i) => ({ type: 'list' as const, musicInfo, originalIndex: i }))

    // 稍后播放列表
    const tempPlayItems: QueueItem[] = tempPlayList.map((item, i) => ({
      type: 'tempPlay' as const,
      musicInfo: item.musicInfo as LX.Music.MusicInfo,
      tempPlayIndex: i,
    }))

    // 当前歌曲之后的列表
    const afterItems: QueueItem[] = musicList
      .slice(playIndex + 1)
      .map((musicInfo, i) => ({ type: 'list' as const, musicInfo, originalIndex: playIndex + 1 + i }))

    setQueueList([...beforeItems, ...tempPlayItems, ...afterItems])
  }, [listId, playInfo.playIndex])

  useEffect(() => {
    buildQueueList()
    const handleListUpdate = (ids: string[]) => {
      if (listId && ids.includes(listId)) {
        buildQueueList()
      }
    }
    const handleTempPlayListUpdate = () => {
      buildQueueList()
    }
    global.app_event.on('myListMusicUpdate', handleListUpdate)
    global.state_event.on('playTempPlayListChanged', handleTempPlayListUpdate)
    return () => {
      global.app_event.off('myListMusicUpdate', handleListUpdate)
      global.state_event.off('playTempPlayListChanged', handleTempPlayListUpdate)
    }
  }, [buildQueueList])

  // Scroll to current playing song
  useEffect(() => {
    const currentIndex = queueList.findIndex(item =>
      item.type === 'list' && item.originalIndex === playInfo.playIndex
    )
    if (currentIndex > -1 && queueList.length > 0) {
      try {
        flatListRef.current?.scrollToIndex({
          index: currentIndex,
          viewPosition: 0.3,
          animated: false,
        })
      } catch {}
    }
  }, [queueList.length, playInfo.playIndex])

  const handlePlay = useCallback((item: QueueItem, _index: number) => {
    if (item.type === 'list') {
      if (!listId) return
      void playList(listId, item.originalIndex)
    } else {
      // 点击稍后播放歌曲：移除该歌曲之前的所有 tempPlayList 项，使目标成为第一项，然后通过 playNext 播放
      for (let i = 0; i < item.tempPlayIndex; i++) {
        removeTempPlayList(0)
      }
      // 现在目标歌曲位于 tempPlayList[0]，playNext 会自动取出并播放
      void playNext()
    }
  }, [listId])

  const handleBack = () => {
    void pop(componentId)
  }

  const renderItem = ({ item, index }: { item: QueueItem; index: number }) => (
    <ListItem
      item={item}
      index={index}
      isPlaying={playerState.isPlay}
      onPress={handlePlay}
      isShowAlbumName={isShowAlbumName}
      isShowInterval={isShowInterval}
    />
  )
  const getkey = (item: QueueItem) => item.type === 'list' ? item.musicInfo.id : `temp_${item.tempPlayIndex}_${item.musicInfo.id}`
  const getItemLayout = (_data: any, index: number) => {
    return { length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index }
  }

  const listName = useMemo(() => {
    if (!listId) return ''
    const allList = listState.allList
    const found = allList.find((l: any) => l.id === listId)
    return found?.name ?? t('play_queue')
  }, [listId, t])

  return (
    <View style={{ ...styles.container, backgroundColor: theme['c-content-background'] }}>
      <StatusBar />
      <View style={{ height: HEADER_HEIGHT + statusBarHeight, paddingTop: statusBarHeight }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={handleBack} activeOpacity={0.5}>
            <Icon name="chevron-left" color={theme['c-font-label']} size={24} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text size={16} color={theme['c-font-label']} numberOfLines={1}>{t('play_queue')}</Text>
            {listName ? <Text size={12} color={theme['c-500']} numberOfLines={1}>{listName}</Text> : null}
          </View>
          <View style={styles.headerBtn} />
        </View>
      </View>
      {
        queueList.length > 0
          ? <FlatList
              ref={flatListRef}
              style={styles.list}
              data={queueList}
              maxToRenderPerBatch={8}
              windowSize={10}
              removeClippedSubviews={true}
              initialNumToRender={15}
              renderItem={renderItem as any}
              keyExtractor={getkey}
              getItemLayout={getItemLayout}
            />
          : <View style={styles.empty}>
              <Text color={theme['c-500']}>{t('play_queue_empty')}</Text>
            </View>
      }
    </View>
  )
}

const styles = createStyle({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    height: '100%',
    alignItems: 'center',
  },
  headerBtn: {
    width: 46,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    flex: 1,
  },
  listItem: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    paddingRight: 2,
    alignItems: 'center',
  },
  sn: {
    width: 38,
    textAlign: 'center',
    paddingLeft: 3,
    paddingRight: 3,
  },
  itemInfo: {
    flexGrow: 1,
    flexShrink: 1,
    paddingRight: 2,
  },
  itemMeta: {
    paddingTop: 3,
    flexDirection: 'row',
  },
  itemMetaText: {
    flexGrow: 0,
    flexShrink: 1,
    fontWeight: '300',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})