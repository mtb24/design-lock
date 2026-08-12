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
} as const

const buttonSchema = {
  $id: ids.Button,
  type: 'object',
  additionalProperties: false,
  required: ['component', 'children'],
  properties: {
    component: { const: 'Button' },
    children: { type: 'string', minLength: 1, maxLength: 80 },
    variant: { type: 'string', enum: ['contained', 'outlined', 'text'] },
    color: { type: 'string', enum: ['primary', 'secondary', 'error', 'warning', 'info', 'success'] },
    size: { type: 'string', enum: ['small', 'medium', 'large'] },
    disabled: { type: 'boolean' },
    href: { type: 'string', maxLength: 300 },
  },
} as const

const chipSchema = {
  $id: ids.Chip,
  type: 'object',
  additionalProperties: false,
  required: ['component', 'label'],
  properties: {
    component: { const: 'Chip' },
    label: { type: 'string', minLength: 1, maxLength: 60 },
    variant: { type: 'string', enum: ['filled', 'outlined'] },
    color: { type: 'string', enum: ['default', 'primary', 'secondary', 'error', 'warning', 'info', 'success'] },
    size: { type: 'string', enum: ['small', 'medium'] },
  },
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
} as const

export const muiComponentRegistry = {
  AppBar: appBarSchema,
  Button: buttonSchema,
  Card: cardSchema,
  CardActions: cardActionsSchema,
  CardContent: cardContentSchema,
  CardHeader: cardHeaderSchema,
  Chip: chipSchema,
  Typography: typographySchema,
} as const

export const muiSchemas = Object.values(muiComponentRegistry)
