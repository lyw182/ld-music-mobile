import { memo } from 'react'
import { navigations } from '@/navigation'
import commonState from '@/store/common/state'
import Btn from './Btn'

export default memo(() => {
  const handlePress = () => {
    navigations.pushPlayQueueScreen(commonState.componentIds.playDetail!)
  }

  return <Btn icon="music_time" onPress={handlePress} />
})