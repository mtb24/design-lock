export function AnyProp(props: { label: any }): null {
  void props
  return null
}

export function UnknownProp(props: { label: unknown }): null {
  void props
  return null
}

export function OpenBag(props: { meta: { [key: string]: string } }): null {
  void props
  return null
}

export function UnresolvedGeneric<T>(props: { value: T }): null {
  void props
  return null
}

export function UnresolvedConditional<T>(props: { value: T extends string ? 'yes' : 'no' }): null {
  void props
  return null
}
