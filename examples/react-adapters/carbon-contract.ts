const carbonTileSchema = {
  $id: 'design-lock/carbon/Tile',
  type: 'object',
  additionalProperties: false,
  required: ['component', 'title', 'body'],
  properties: {
    component: { const: 'Tile' },
    eyebrow: { type: 'string', maxLength: 80 },
    title: { type: 'string', minLength: 1, maxLength: 120 },
    body: { type: 'string', minLength: 1, maxLength: 600 },
    tags: { type: 'array', maxItems: 8, items: { type: 'string', maxLength: 40 } },
    actionLabel: { type: 'string', maxLength: 60 },
    actionHref: { type: 'string', maxLength: 300 },
  },
} as const

const carbonHeaderSchema = {
  $id: 'design-lock/carbon/Header',
  type: 'object',
  additionalProperties: false,
  required: ['component', 'productName', 'links'],
  properties: {
    component: { const: 'Header' },
    productName: { type: 'string', minLength: 1, maxLength: 80 },
    links: {
      type: 'array',
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'href'],
        properties: {
          label: { type: 'string', minLength: 1, maxLength: 50 },
          href: { type: 'string', minLength: 1, maxLength: 300 },
        },
      },
    },
  },
} as const

const carbonTagListSchema = {
  $id: 'design-lock/carbon/TagList',
  type: 'object',
  additionalProperties: false,
  required: ['component', 'tags'],
  properties: {
    component: { const: 'TagList' },
    tags: {
      type: 'array',
      minItems: 1,
      maxItems: 12,
      items: { type: 'string', minLength: 1, maxLength: 40 },
    },
    tone: {
      type: 'string',
      enum: ['blue', 'cyan', 'green', 'purple', 'teal'],
      default: 'blue',
    },
  },
} as const

const carbonNotificationSchema = {
  $id: 'design-lock/carbon/InlineNotification',
  type: 'object',
  additionalProperties: false,
  required: ['component', 'title', 'subtitle'],
  properties: {
    component: { const: 'InlineNotification' },
    title: { type: 'string', minLength: 1, maxLength: 100 },
    subtitle: { type: 'string', minLength: 1, maxLength: 240 },
    kind: {
      type: 'string',
      enum: ['info', 'success', 'warning', 'error'],
      default: 'info',
    },
  },
} as const

export const carbonComponentRegistry = {
  Tile: carbonTileSchema,
  Header: carbonHeaderSchema,
  TagList: carbonTagListSchema,
  InlineNotification: carbonNotificationSchema,
} as const

export const carbonSchemas = Object.values(carbonComponentRegistry)
