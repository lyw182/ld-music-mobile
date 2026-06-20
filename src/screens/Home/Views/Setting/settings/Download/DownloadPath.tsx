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

  return (
    <>
      <SubTitle title={t('setting_download_path')}>
        <View style={styles.pathContainer}>
          <Button onPress={handleSelectPath}>{t('setting_download_path_select')}</Button>
          {downloadPath ? (
            <Text style={styles.pathText} size={12} color={theme['c-500']} numberOfLines={2}>{downloadPath}</Text>
          ) : (
            <Text style={styles.pathText} size={12} color={theme['c-400']}>{t('setting_download_path_empty')}</Text>
          )}
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

const styles = createStyle({
  pathContainer: {
    flexDirection: 'column',
    gap: 8,
  },
  pathText: {
    paddingLeft: 5,
  },
})