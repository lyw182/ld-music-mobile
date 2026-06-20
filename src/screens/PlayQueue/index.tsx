import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, TouchableOpacity, FlatList, type FlatListProps } from 'react-native'
import { pop } from '@/navigation'
import { useTheme } from '@/store/theme/hook'
import { usePlayInfo } from '@/store/player/hook'
import { useStatusbarHeight } from '@/store/common/hook'
import { useI18n } from '@/lang'
import { playList } from '@/core/player/player'
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

type FlatListType = FlatListProps<LX.Music.MusicInfo>

interface Props {
  componentId: string
}

const ListItem = ({ item, index, isActive, isPlaying, onPress, isShowAlbumName, isShowInterval }: {
  item: LX.Music.MusicInfo
  index: number
  isActive: boolean
  isPlaying: boolean
  onPress: (item: LX.Music.MusicInfo, index: number) => void
  isShowAlbumName: boolean
  isShowInterval: boolean
}) => {
  const theme = useTheme()
  const singer = `${item.singer}${isShowAlbumName && item.meta.albumName ? ` · ${item.meta.albumName}` : ''}`

  return (
    <TouchableOpacity
      style={{ ...styles.listItem, height: ITEM_HEIGHT }}
      onPress={() => { onPress(item, index) }}
      activeOpacity={0.5}
    >
      {
        isActive && isPlaying
          ? <Icon style={styles.sn} name="play-outline" size={13} color={theme['c-primary-font']} />
          : <Text style={styles.sn} size={13} color={isActive ? theme['c-primary-font'] : theme['c-300']}>{index + 1}</Text>
      }
      <View style={styles.itemInfo}>
        <Text color={isActive ? theme['c-primary-font'] : theme['c-font']} numberOfLines={1}>{item.name}</Text>
        <View style={styles.itemMeta}>
          <Badge>{item.source.toUpperCase()}</Badge>
          <Text style={styles.itemMetaText} size={11} color={isActive ? theme['c-primary-alpha-200'] : theme['c-500']} numberOfLines={1}>
            {singer}
          </Text>
        </View>
      </View>
      {
        isShowInterval ? (
          <Text size={12} color={isActive ? theme['c-primary-alpha-400'] : theme['c-250']} numberOfLines={1}>{item.interval}</Text>
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
  const [list, setList] = useState<LX.List.ListMusics>([])

  const listId = playInfo.playerListId

  const updateList = useCallback(() => {
    if (!listId) {
      setList([])
      return
    }
    const musicList = getListMusicSync(listId)
    setList([...musicList])
  }, [listId])

  useEffect(() => {
    updateList()
    const handleListUpdate = (ids: string[]) => {
      if (listId && ids.includes(listId)) {
        updateList()
      }
    }
    global.app_event.on('myListMusicUpdate', handleListUpdate)
    return () => {
      global.app_event.off('myListMusicUpdate', handleListUpdate)
    }
  }, [updateList])

  // Scroll to current playing song
  useEffect(() => {
    if (playInfo.playIndex > -1 && list.length > 0) {
      try {
        flatListRef.current?.scrollToIndex({
          index: playInfo.playIndex,
          viewPosition: 0.3,
          animated: false,
        })
      } catch {}
    }
  }, [list.length, playInfo.playIndex])

  const handlePlay = useCallback((item: LX.Music.MusicInfo, index: number) => {
    if (!listId) return
    void playList(listId, index)
  }, [listId])

  const handleBack = () => {
    void pop(componentId)
  }

  const renderItem: FlatListType['renderItem'] = ({ item, index }) => (
    <ListItem
      item={item}
      index={index}
      isActive={playInfo.playIndex === index}
      isPlaying={playerState.isPlay}
      onPress={handlePlay}
      isShowAlbumName={isShowAlbumName}
      isShowInterval={isShowInterval}
    />
  )
  const getkey: FlatListType['keyExtractor'] = item => item.id
  const getItemLayout: FlatListType['getItemLayout'] = (data, index) => {
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
        list.length > 0
          ? <FlatList
              ref={flatListRef}
              style={styles.list}
              data={list}
              maxToRenderPerBatch={8}
              windowSize={10}
              removeClippedSubviews={true}
              initialNumToRender={15}
              renderItem={renderItem}
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