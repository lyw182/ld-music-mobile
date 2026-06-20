import { memo, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'

import SubTitle from '../../components/SubTitle'
import CheckBox from '@/components/common/CheckBox'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'

const FILE_NAME_FORMATS = ['歌名 - 歌手', '歌手 - 歌名', '歌名'] as const

const useActive = (id: string) => {
  const format = useSettingValue('download.fileName')
  const isActive = useMemo(() => format == id, [format, id])
  return isActive
}

const Item = ({ id, name }: { id: string, name: string }) => {
  const isActive = useActive(id)
  return <CheckBox marginRight={8} check={isActive} label={name} onChange={() => { updateSetting({ 'download.fileName': id as any }) }} need />
}

export default memo(() => {
  const t = useI18n()

  return (
    <SubTitle title={t('setting_download_file_name')}>
      <View style={styles.list}>
        {
          FILE_NAME_FORMATS.map((f) => <Item name={f} id={f} key={f} />)
        }
      </View>
    </SubTitle>
  )
})

const styles = StyleSheet.create({
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
})