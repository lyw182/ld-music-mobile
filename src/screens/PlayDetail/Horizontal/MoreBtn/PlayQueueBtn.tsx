import { memo, useState } from 'react'
import { TouchableOpacity } from 'react-native'
import { navigations } from '@/navigation'
import commonState from '@/store/common/state'
import { Icon } from '@/components/common/Icon'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { scaleSizeW } from '@/utils/pixelRatio'

const BTN_SIZE = scaleSizeW(48)
const ICON_SIZE = 24

export default memo(() => {
  const theme = useTheme()
  const [pressed, setPressed] = useState(false)

  const handlePress = () => {
    navigations.pushPlayQueueScreen(commonState.componentIds.playDetail!)
  }

  const bgColor = pressed ? theme['c-primary-dark-100'] : theme['c-primary']

  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: bgColor }]}
      activeOpacity={1}
      onPress={handlePress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
    >
      <Icon name="music_time" color="#fff" size={ICON_SIZE} />
    </TouchableOpacity>
  )
})

const styles = createStyle({
  btn: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
})