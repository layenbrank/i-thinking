import {
  Provider,
  Series,
  type ComboboxProps,
  type SeriesOption,
  type SeriesProps
} from '@/components/combobox/combobox.tsx'

const Combobox = Object.assign(Provider, {
  Series: Series
})
export { Combobox, type ComboboxProps, type SeriesOption, type SeriesProps }
