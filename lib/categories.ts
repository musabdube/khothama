export type CategoryPathNode = {
  id: string
  name: string
  slug: string
  parentId?: string | null
  parent?: CategoryPathNode | null
}

export type CategoryOption = CategoryPathNode & {
  description?: string | null
  image?: string | null
  sortOrder?: number
  isActive?: boolean
  children?: CategoryOption[]
}

export function formatCategoryPath(category?: CategoryPathNode | null) {
  if (!category) return ""

  const names: string[] = []
  let current: CategoryPathNode | null | undefined = category

  while (current) {
    names.unshift(current.name)
    current = current.parent
  }

  return names.join(" / ")
}

export function getRootCategories(categories: CategoryOption[]) {
  return categories.filter((category) => !category.parentId)
}

export function getSubcategories(categories: CategoryOption[], parentId: string) {
  return categories.filter((category) => category.parentId === parentId)
}

export function findCategoryById(categories: CategoryOption[], id: string) {
  return categories.find((category) => category.id === id) || null
}