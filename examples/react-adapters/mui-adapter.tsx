import {
  AppBar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Chip,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from '@mui/material'
import type { DesignLockNode, DesignSystemAdapter } from '@design-lock/core'
import { Fragment, type ComponentProps, type ReactNode } from 'react'
import { asRecord, isDesignLockNode, prepareAdapterTree, safeAdapterHref } from './adapter-utils'
import { designSystemContracts } from './systems'

const muiTheme = createTheme({
  palette: {
    primary: { main: '#7b1fa2' },
    secondary: { main: '#ed6c02' },
    background: { default: '#faf7fc', paper: '#ffffff' },
  },
  shape: { borderRadius: 14 },
})

function enumValue<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === 'string' && allowed.includes(value as T) ? value as T : undefined
}

function renderTypography(node: DesignLockNode): ReactNode {
  const { children, ...props } = node
  return <Typography variant={props.variant as ComponentProps<typeof Typography>['variant']} color={props.color as ComponentProps<typeof Typography>['color']} align={props.align as ComponentProps<typeof Typography>['align']}>{typeof children === 'string' ? children : null}</Typography>
}

function renderButton(node: DesignLockNode): ReactNode {
  const { children, ...props } = node
  return <Button variant={(props.variant as 'contained') ?? 'contained'} color={(props.color as 'primary') ?? 'primary'} size={(props.size as 'medium') ?? 'medium'} disabled={Boolean(props.disabled)} href={typeof props.href === 'string' ? props.href : undefined}>{typeof children === 'string' ? children : null}</Button>
}

function renderChip(node: DesignLockNode): ReactNode {
  const props = asRecord(node)
  return <Chip label={String(props.label ?? '')} variant={props.variant as 'filled' | 'outlined' | undefined} color={props.color as 'default' | undefined} size={props.size as 'small' | 'medium' | undefined} />
}

function renderCardHeader(node: DesignLockNode): ReactNode {
  const props = asRecord(node)
  return <CardHeader title={String(props.title ?? '')} subheader={typeof props.subheader === 'string' ? props.subheader : undefined} />
}

function renderChildren(children: DesignLockNode['children']): ReactNode {
  if (typeof children === 'string') return children
  if (Array.isArray(children)) return children.map((child, index) => <Fragment key={index}>{renderNode(child)}</Fragment>)
  return isDesignLockNode(children) ? renderNode(children) : null
}

function renderCardContent(node: DesignLockNode): ReactNode {
  return <CardContent>{renderChildren(node.children)}</CardContent>
}

function renderCardActions(node: DesignLockNode): ReactNode {
  return <CardActions>{renderChildren(node.children)}</CardActions>
}

function renderCard(node: DesignLockNode): ReactNode {
  const props = asRecord(node)
  const variant = props.variant === 'outlined' ? 'outlined' : 'elevation'
  const elevation = typeof props.elevation === 'number' ? props.elevation : 4
  return <Card variant={variant} elevation={variant === 'outlined' ? 0 : elevation}>{renderChildren(node.children)}</Card>
}

function renderAppBar(node: DesignLockNode): ReactNode {
  const props = asRecord(node)
  const nodes = Array.isArray(node.children) ? node.children : []
  return <AppBar position={(props.position as 'static') ?? 'static'} color={(props.color as 'primary') ?? 'primary'}><Toolbar sx={{ gap: 1, flexWrap: 'wrap' }}>{nodes.map((child, index) => <Box key={index} sx={{ flexGrow: index === 0 && child.component === 'Typography' ? 1 : 0 }}>{renderNode(child)}</Box>)}</Toolbar></AppBar>
}

const renderers: Record<string, (node: DesignLockNode) => ReactNode> = {
  AppBar: renderAppBar,
  Button: renderButton,
  Card: renderCard,
  CardActions: renderCardActions,
  CardContent: renderCardContent,
  CardHeader: renderCardHeader,
  Chip: renderChip,
  Typography: renderTypography,
}

function renderNode(node: DesignLockNode): ReactNode {
  return renderers[node.component]?.(node) ?? null
}

function renderTree(tree: DesignLockNode | DesignLockNode[]): ReactNode {
  const nodes = Array.isArray(tree) ? tree : [tree]
  return <ThemeProvider theme={muiTheme}><Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{nodes.map((node, index) => <Fragment key={index}>{renderNode(node)}</Fragment>)}</Box></ThemeProvider>
}

function prepareTypography(node: DesignLockNode): DesignLockNode {
  const props = asRecord(node)
  return {
    component: 'Typography',
    children: typeof node.children === 'string' ? node.children : '',
    ...(enumValue(props.variant, ['h3', 'h4', 'h5', 'h6', 'subtitle1', 'subtitle2', 'body1', 'body2', 'caption', 'overline']) ? { variant: props.variant } : {}),
    ...(enumValue(props.color, ['primary', 'secondary', 'text.primary', 'text.secondary', 'error']) ? { color: props.color } : {}),
    ...(enumValue(props.align, ['left', 'center', 'right', 'justify']) ? { align: props.align } : {}),
  }
}

function prepareButton(node: DesignLockNode): DesignLockNode {
  const props = asRecord(node)
  return {
    component: 'Button',
    children: typeof node.children === 'string' ? node.children : '',
    ...(enumValue(props.variant, ['contained', 'outlined', 'text']) ? { variant: props.variant } : {}),
    ...(enumValue(props.color, ['primary', 'secondary', 'error', 'warning', 'info', 'success']) ? { color: props.color } : {}),
    ...(enumValue(props.size, ['small', 'medium', 'large']) ? { size: props.size } : {}),
    ...(typeof props.disabled === 'boolean' ? { disabled: props.disabled } : {}),
    ...(safeAdapterHref(props.href) ? { href: props.href.trim() } : {}),
  }
}

function prepareChip(node: DesignLockNode): DesignLockNode {
  const props = asRecord(node)
  return {
    component: 'Chip',
    label: String(props.label ?? ''),
    ...(enumValue(props.variant, ['filled', 'outlined']) ? { variant: props.variant } : {}),
    ...(enumValue(props.color, ['default', 'primary', 'secondary', 'error', 'warning', 'info', 'success']) ? { color: props.color } : {}),
    ...(enumValue(props.size, ['small', 'medium']) ? { size: props.size } : {}),
  }
}

function prepareCardHeader(node: DesignLockNode): DesignLockNode {
  const props = asRecord(node)
  return { component: 'CardHeader', title: String(props.title ?? ''), ...(typeof props.subheader === 'string' ? { subheader: props.subheader } : {}) }
}

function prepareChildren(children: DesignLockNode['children'], allowed: readonly string[]): DesignLockNode[] {
  if (!Array.isArray(children)) return []
  return children.flatMap((child) => {
    if (!allowed.includes(child.component)) return []
    const prepared = prepareNode(child)
    return prepared ? [prepared] : []
  })
}

function prepareContentChildren(children: DesignLockNode['children']): string | DesignLockNode | DesignLockNode[] {
  if (typeof children === 'string') return children
  if (Array.isArray(children)) return prepareChildren(children, ['Typography'])
  if (!isDesignLockNode(children) || children.component !== 'Typography') return []
  return prepareNode(children) ?? []
}

function prepareCardContent(node: DesignLockNode): DesignLockNode {
  return { component: 'CardContent', children: prepareContentChildren(node.children) }
}

function prepareCardActions(node: DesignLockNode): DesignLockNode {
  return { component: 'CardActions', children: prepareChildren(node.children, ['Button']) }
}

function prepareCard(node: DesignLockNode): DesignLockNode {
  const props = asRecord(node)
  return { component: 'Card', children: prepareChildren(node.children, ['CardHeader', 'CardContent', 'CardActions']), ...(enumValue(props.variant, ['elevation', 'outlined']) ? { variant: props.variant } : {}), ...(Number.isInteger(props.elevation) ? { elevation: props.elevation } : {}) }
}

function prepareAppBar(node: DesignLockNode): DesignLockNode {
  const props = asRecord(node)
  return { component: 'AppBar', children: prepareChildren(node.children, ['Typography', 'Button', 'Chip']), ...(enumValue(props.position, ['sticky', 'static', 'relative']) ? { position: props.position } : {}), ...(enumValue(props.color, ['default', 'primary', 'secondary', 'transparent']) ? { color: props.color } : {}) }
}

const preparers: Record<string, (node: DesignLockNode) => DesignLockNode> = {
  AppBar: prepareAppBar,
  Button: prepareButton,
  Card: prepareCard,
  CardActions: prepareCardActions,
  CardContent: prepareCardContent,
  CardHeader: prepareCardHeader,
  Chip: prepareChip,
  Typography: prepareTypography,
}

function prepareNode(node: DesignLockNode): DesignLockNode | null {
  return preparers[node.component]?.(node) ?? null
}

export const muiAdapter: DesignSystemAdapter<ReactNode> = {
  ...designSystemContracts.mui,
  render: renderTree,
  prepareLenient: (tree) => prepareAdapterTree(tree, prepareNode),
}
