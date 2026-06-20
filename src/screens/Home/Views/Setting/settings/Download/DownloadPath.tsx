import { memo, useRef, useState } from 'react'
import { View } from 'react-native'

import ChoosePath, { type ChoosePathType } from '@/components/common/ChoosePath'
import SubTitle from '../../components/SubTitle'
import Button from '../../components/Button'
import Text from '@/components/common/Text'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const downloadPath = useSettingValue('download.path')
  const choosePathRef = useRef<ChoosePathType>(null)
  const [visible, setVisible] = useState(false)

  const handleSelectPath = () => {
    if (visible) {
      choosePathRef.current?.show({
        title: t('setting_download_path_select'),
        dirOnly: true,
      })
    } else {
      setVisible(true)
      requestAnimationFrame(() => {
        choosePathRef.current?.show({
          title: t('setting_download_path_select'),
          dirOnly: true,
        })
      })
    }
  }

  const onConfirmPath = (path: string) => {
    updateSetting({ 'download.path': path })
  }

  const styles = createStyle({
    pathContainer: {
      flexDirection: 'column',
      gap: 8,
    },
    pathBar: {
      flex: 1,
      height: 36,
      paddingHorizontal: 10,
      borderRadius: 4,
      borderWidth: 1,
      justifyContent: 'center',
    },
    btn: {
      flexDirection: 'row',
    },
  });

  return (
    <>
      <SubTitle title={t('setting_download_path')}>
        <View style={styles.pathContainer}>
          <View style={{ ...styles.pathBar, backgroundColor: theme['c-border-background'], borderColor: theme['c-border-background'] }}>
            {downloadPath ? (
              <Text size={13} color={theme['c-font']} numberOfLines={1}>{downloadPath}</Text>
            ) : (
              <Text size={13} color={theme['c-400']}>{t('setting_download_path_empty')}</Text>
            )}
          </View>
          <View style={styles.btn}>
            <Button onPress={handleSelectPath}>{t('setting_download_path_select')}</Button>
          </View>
        </View>
      </SubTitle>
      {
        visible
          ? <ChoosePath ref={choosePathRef} onConfirm={onConfirmPath} />
          : null
      }
    </>
  )
})
