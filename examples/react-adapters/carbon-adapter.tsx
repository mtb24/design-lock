import {
  Button,
  Header,
  HeaderMenuItem,
  HeaderName,
  HeaderNavigation,
  InlineNotification,
  Tag,
  Theme,
  Tile,
} from '@carbon/react'
import type { DesignLockNode, DesignSystemAdapter } from '@design-lock/core'
import { Fragment, type ReactNode } from 'react'
import { asRecord, prepareAdapterTree, safeAdapterHref } from './adapter-utils'
import { designSystemContracts } from './systems'

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function renderTile(node: DesignLockNode): ReactNode {
  const props = asRecord(node)
  const href = typeof props.actionHref === 'string' ? props.actionHref : undefined
  return (
    <Tile className="min-h-64">
      {typeof props.eyebrow === 'string' ? <p className="cds--label-01 mb-4 uppercase">{props.eyebrow}</p> : null}
      <h3 className="cds--heading-04">{String(props.title ?? '')}</h3>
      <p className="cds--body-compact-01 mt-4 max-w-xl">{String(props.body ?? '')}</p>
      <div className="mt-5 flex flex-wrap gap-1">{strings(props.tags).map((tag) => <Tag key={tag} type="blue">{tag}</Tag>)}</div>
      {typeof props.actionLabel === 'string' ? <Button className="mt-6" kind="primary" href={href}>{props.actionLabel}</Button> : null}
    </Tile>
  )
}

function renderHeader(node: DesignLockNode): ReactNode {
  const props = asRecord(node)
  const links = Array.isArray(props.links) ? props.links : []
  return (
    <Header aria-label={String(props.productName ?? 'Carbon')}>
      <HeaderName href="#" prefix="IBM">{String(props.productName ?? '')}</HeaderName>
      <HeaderNavigation aria-label="Carbon navigation">
        {links.map((item, index) => {
          const link = item as { label?: unknown; href?: unknown }
          return <HeaderMenuItem key={index} href={String(link.href ?? '#')}>{String(link.label ?? '')}</HeaderMenuItem>
        })}
      </HeaderNavigation>
    </Header>
  )
}

function renderTagList(node: DesignLockNode): ReactNode {
  const props = asRecord(node)
  return <div className="flex min-h-32 flex-wrap content-start gap-2 bg-white p-6">{strings(props.tags).map((tag) => <Tag key={tag} size="md" type={(props.tone as 'blue') ?? 'blue'}>{tag}</Tag>)}</div>
}

function renderNotification(node: DesignLockNode): ReactNode {
  const props = asRecord(node)
  return <div className="bg-white p-5"><InlineNotification hideCloseButton kind={(props.kind as 'info') ?? 'info'} title={String(props.title ?? '')} subtitle={String(props.subtitle ?? '')} /></div>
}

const renderers: Record<string, (node: DesignLockNode) => ReactNode> = {
  Tile: renderTile,
  Header: renderHeader,
  TagList: renderTagList,
  InlineNotification: renderNotification,
}

function renderNode(node: DesignLockNode): ReactNode {
  return renderers[node.component]?.(node) ?? null
}

function renderTree(tree: DesignLockNode | DesignLockNode[]): ReactNode {
  const nodes = Array.isArray(tree) ? tree : [tree]
  return <Theme theme="white"><div className="grid gap-4 font-sans">{nodes.map((node, index) => <Fragment key={index}>{renderNode(node)}</Fragment>)}</div></Theme>
}

function prepareTile(node: DesignLockNode): DesignLockNode {
  const props = asRecord(node)
  return {
    component: 'Tile',
    title: String(props.title ?? ''),
    body: String(props.body ?? ''),
    ...(typeof props.eyebrow === 'string' ? { eyebrow: props.eyebrow } : {}),
    ...(Array.isArray(props.tags) ? { tags: strings(props.tags) } : {}),
    ...(typeof props.actionLabel === 'string' ? { actionLabel: props.actionLabel } : {}),
    ...(safeAdapterHref(props.actionHref) ? { actionHref: props.actionHref.trim() } : {}),
  }
}

function prepareHeader(node: DesignLockNode): DesignLockNode {
  const props = asRecord(node)
  const links = Array.isArray(props.links)
    ? props.links.flatMap((item) => {
        if (typeof item !== 'object' || item === null) return []
        const link = item as { label?: unknown; href?: unknown }
        return typeof link.label === 'string' && safeAdapterHref(link.href)
          ? [{ label: link.label, href: link.href.trim() }]
          : []
      })
    : []
  return { component: 'Header', productName: String(props.productName ?? ''), links }
}

function prepareTagList(node: DesignLockNode): DesignLockNode {
  const props = asRecord(node)
  const tone = ['blue', 'cyan', 'green', 'purple', 'teal'].includes(String(props.tone)) ? { tone: props.tone } : {}
  return { component: 'TagList', tags: strings(props.tags), ...tone }
}

function prepareNotification(node: DesignLockNode): DesignLockNode {
  const props = asRecord(node)
  const kind = ['info', 'success', 'warning', 'error'].includes(String(props.kind)) ? { kind: props.kind } : {}
  return { component: 'InlineNotification', title: String(props.title ?? ''), subtitle: String(props.subtitle ?? ''), ...kind }
}

const preparers: Record<string, (node: DesignLockNode) => DesignLockNode> = {
  Tile: prepareTile,
  Header: prepareHeader,
  TagList: prepareTagList,
  InlineNotification: prepareNotification,
}

function prepareNode(node: DesignLockNode): DesignLockNode | null {
  return preparers[node.component]?.(node) ?? null
}

export const carbonAdapter: DesignSystemAdapter<ReactNode> = {
  ...designSystemContracts.carbon,
  render: renderTree,
  prepareLenient: (tree) => prepareAdapterTree(tree, prepareNode),
}
