import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, PanResponder } from 'react-native'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { scaleSizeW, scaleSizeH } from '@/utils/pixelRatio'
import { useDrag } from '@/utils/hooks'
// import { AppColors } from '@/theme'


// Material 3 滑块尺寸常量
const progressContentPadding = 10
const progressHeight = 4
const progressContentHeight = progressContentPadding * 2 + progressHeight
const progressHeightSize = scaleSizeH(progressHeight)
const thumbSize = scaleSizeW(20)
const haloSize = scaleSizeW(40)

const DefaultBar = memo(() => {
  const theme = useTheme()

  return <View style={{ ...styles.progressBar, backgroundColor: theme['c-primary-alpha-700'], position: 'absolute', width: '100%', left: 0, top: 0 }}></View>
})

const BufferedBar = memo(({ progress }: { progress: number }) => {
  const theme = useTheme()
  return <View style={{ ...styles.progressBar, backgroundColor: theme['c-primary-alpha-400'], position: 'absolute', width: `${progress * 100}%`, left: 0, top: 0 }}></View>
})

// Material 3 滑块手柄
const Thumb = memo(({ color, dragging }: { color: string; dragging: boolean }) => {
  const thumbCenterStyle = useMemo(() => ({
    position: 'absolute' as const,
    right: -thumbSize / 2,
    top: -(thumbSize - progressHeightSize) / 2,
  }), [])

  return (
    <View style={thumbCenterStyle}>
      {/* 拖拽时的光晕 */}
      {dragging ? (
        <View
          style={{
            position: 'absolute',
            left: -(haloSize - thumbSize) / 2,
            top: -(haloSize - thumbSize) / 2,
            width: haloSize,
            height: haloSize,
            borderRadius: haloSize / 2,
            backgroundColor: color + '40', // ~25% opacity
          }}
        />
      ) : null}
      {/* 手柄主体 */}
      <View
        style={{
          width: thumbSize,
          height: thumbSize,
          borderRadius: thumbSize / 2,
          backgroundColor: color,
          elevation: 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.2,
          shadowRadius: 1.5,
        }}
      />
    </View>
  )
})


const PreassBar = memo(({ onDragState, setDragProgress, onSetProgress }: {
  onDragState: (drag: boolean) => void
  setDragProgress: (progress: number) => void
  onSetProgress: (progress: number) => void
}) => {
  const {
    onLayout,
    onDragStart,
    onDragEnd,
    onDrag,
  } = useDrag(onSetProgress, onDragState, setDragProgress)

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,

      onPanResponderMove: (evt, gestureState) => {
        onDrag(gestureState.dx)
      },
      onPanResponderGrant: (evt, gestureState) => {
        onDragStart(gestureState.dx, evt.nativeEvent.locationX)
      },
      onPanResponderRelease: () => {
        onDragEnd()
      },
    }),
  ).current

  return <View onLayout={onLayout} style={styles.pressBar} {...panResponder.panHandlers} />
})


const Progress = ({ progress, duration, buffered }: {
  progress: number
  duration: number
  buffered: number
}) => {
  const theme = useTheme()
  const [draging, setDraging] = useState(false)
  const [dragProgress, setDragProgress] = useState(0)
  const progressStr: `${number}%` = `${progress * 100}%`

  const durationRef = useRef(duration)
  useEffect(() => {
    durationRef.current = duration
  }, [duration])
  const onSetProgress = useCallback((progress: number) => {
    global.app_event.setProgress(progress * durationRef.current)
  }, [])

  return (
    <View style={styles.progress}>
      <View>
        <DefaultBar />
        <BufferedBar progress={buffered} />
        {
          draging
            ? (
                <>
                  <View style={{ ...styles.progressBar, backgroundColor: theme['c-primary-alpha-800'], width: progressStr, position: 'absolute', left: 0, top: 0 }} />
                  <View style={{ ...styles.progressBar, backgroundColor: theme['c-primary'], width: `${dragProgress * 100}%`, position: 'absolute', left: 0, top: 0 }}>
                    <Thumb color={theme['c-primary']} dragging={true} />
                  </View>
                </>
              ) : (
                <View style={{ ...styles.progressBar, backgroundColor: theme['c-primary'], width: progressStr, position: 'absolute', left: 0, top: 0 }}>
                  <Thumb color={theme['c-primary']} dragging={false} />
                </View>
              )
        }
      </View>
      <PreassBar onDragState={setDraging} setDragProgress={setDragProgress} onSetProgress={onSetProgress} />
    </View>
  )
}


const styles = createStyle({
  progress: {
    width: '100%',
    height: progressContentHeight,
    paddingTop: progressContentPadding,
    paddingBottom: progressContentPadding,
    zIndex: 1,
  },
  progressBar: {
    height: progressHeight,
    borderRadius: progressHeight / 2,
  },
  pressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: progressContentHeight,
    paddingTop: progressContentPadding,
    paddingBottom: progressContentPadding,
    width: '100%',
    zIndex: 6,
  },
})

export default Progress
