import { memo } from 'react'

import CheckBoxItem from '../../components/CheckBoxItem'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'

export default memo(() => {
  const t = useI18n()
  const isEnable = useSettingValue('download.enable')
  const setEnable = (val: boolean) => {
    updateSetting({ 'download.enable': val })
  }

  return <CheckBoxItem check={isEnable} onChange={setEnable} label={t('setting_download_enable')} />
})