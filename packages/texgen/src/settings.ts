export const SettingsTemplate = {
  prop1: { type: 'string', value: 'string!' },
  prop2: { type: 'float', value: 1.0 },
  panel: {
    type: 'panel',
    panel: 'Panel!',
    children: {
      prop3: { type: 'bool', value: false },
    },
  },
} as const
