const ids = {
  AppBar: 'https://design-lock.local/schemas/mui/AppBar',
  Button: 'https://design-lock.local/schemas/mui/Button',
  Card: 'https://design-lock.local/schemas/mui/Card',
  CardActions: 'https://design-lock.local/schemas/mui/CardActions',
  CardContent: 'https://design-lock.local/schemas/mui/CardContent',
  CardHeader: 'https://design-lock.local/schemas/mui/CardHeader',
  Chip: 'https://design-lock.local/schemas/mui/Chip',
  Typography: 'https://design-lock.local/schemas/mui/Typography',
} as const

const composition = 'adapter-composition' as const

const typographySchema = {
  $id: ids.Typography,
  type: 'object',
  additionalProperties: false,
  required: ['component', 'children'],
  properties: {
    component: { const: 'Typography' },
    children: { type: 'string', minLength: 1, maxLength: 600 },
    variant: {
      type: 'string',
      enum: ['h3', 'h4', 'h5', 'h6', 'subtitle1', 'subtitle2', 'body1', 'body2', 'caption', 'overline'],
    },
    color: {
      type: 'string',
      enum: ['primary', 'secondary', 'text.primary', 'text.secondary', 'error'],
    },
    align: { type: 'string', enum: ['left', 'center', 'right', 'justify'] },
  },
  'x-design-lock-authority': composition,
} as const

const cardHeaderSchema = {
  $id: ids.CardHeader,
  type: 'object',
  additionalProperties: false,
  required: ['component', 'title'],
  properties: {
    component: { const: 'CardHeader' },
    title: { type: 'string', minLength: 1, maxLength: 120 },
    subheader: { type: 'string', maxLength: 160 },
  },
  'x-design-lock-authority': composition,
} as const

const cardContentSchema = {
  $id: ids.CardContent,
  type: 'object',
  additionalProperties: false,
  required: ['component', 'children'],
  properties: {
    component: { const: 'CardContent' },
    children: {
      oneOf: [
        { type: 'string', maxLength: 600 },
        { $ref: ids.Typography },
        { type: 'array', maxItems: 8, items: { $ref: ids.Typography } },
      ],
    },
  },
  'x-design-lock-authority': composition,
} as const

const cardActionsSchema = {
  $id: ids.CardActions,
  type: 'object',
  additionalProperties: false,
  required: ['component', 'children'],
  properties: {
    component: { const: 'CardActions' },
    children: { type: 'array', maxItems: 4, items: { $ref: ids.Button } },
  },
  'x-design-lock-authority': composition,
} as const

const cardSchema = {
  $id: ids.Card,
  type: 'object',
  additionalProperties: false,
  required: ['component', 'children'],
  properties: {
    component: { const: 'Card' },
    variant: { type: 'string', enum: ['elevation', 'outlined'] },
    elevation: { type: 'integer', minimum: 0, maximum: 12 },
    children: {
      type: 'array',
      minItems: 1,
      maxItems: 8,
      items: {
        oneOf: [
          { $ref: ids.CardHeader },
          { $ref: ids.CardContent },
          { $ref: ids.CardActions },
        ],
      },
    },
  },
  'x-design-lock-authority': composition,
} as const

const appBarSchema = {
  $id: ids.AppBar,
  type: 'object',
  additionalProperties: false,
  required: ['component', 'children'],
  properties: {
    component: { const: 'AppBar' },
    position: { type: 'string', enum: ['sticky', 'static', 'relative'] },
    color: { type: 'string', enum: ['default', 'primary', 'secondary', 'transparent'] },
    children: {
      type: 'array',
      minItems: 1,
      maxItems: 8,
      items: {
        oneOf: [
          { $ref: ids.Typography },
          { $ref: ids.Button },
          { $ref: ids.Chip },
        ],
      },
    },
  },
  'x-design-lock-authority': composition,
} as const

export const muiComponentRegistry = {
  AppBar: appBarSchema,
  Card: cardSchema,
  CardActions: cardActionsSchema,
  CardContent: cardContentSchema,
  CardHeader: cardHeaderSchema,
  Typography: typographySchema,
} as const

export const muiSchemas = Object.values(muiComponentRegistry)
