type TemplateWithId = {
  id: string;
  isPublic?: boolean;
};

export function getInitialTemplateId(
  queryTemplate: string | string[] | undefined,
  templates: readonly TemplateWithId[],
) {
  const publicTemplates = templates.filter((template) => template.isPublic !== false);
  const fallbackTemplateId = publicTemplates[0]?.id ?? "";

  if (typeof queryTemplate !== "string") {
    return fallbackTemplateId;
  }

  return publicTemplates.some((template) => template.id === queryTemplate)
    ? queryTemplate
    : fallbackTemplateId;
}
