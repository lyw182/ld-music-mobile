import { memo } from 'react'

import Section from '../../components/Section'
import IsEnable from './IsEnable'
import DownloadPath from './DownloadPath'
import FileName from './FileName'
import { useI18n } from '@/lang/i18n'

export default memo(() => {
  const t = useI18n()

  return (
    <Section title={t('setting_download')}>
      <IsEnable />
      <DownloadPath />
      <FileName />
    </Section>
  )
})