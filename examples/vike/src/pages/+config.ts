import type { Config } from 'vike/types'
import vikeReact from 'vike-react/config'
import vikeReactQuery from 'vike-react-query/config'
import vikeReactZustand from 'vike-react-zustand/config'

export default {
  title: 'My App',
  extends: [vikeReact, vikeReactQuery, vikeReactZustand]
} satisfies Config
