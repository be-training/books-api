type ValidationError = {
  instancePath: string;
  keyword: string;
  params: Record<string, unknown>;
};

const FIELD_LABELS: Record<string, string> = {
  publishedYear: "Published year",
  totalCopies: "Total copies",
  title: "Title",
  author: "Author",
  isbn: "ISBN",
  publisher: "Publisher",
  edition: "Edition",
  description: "Description",
  tags: "Tags",
  status: "Status",
  id: "ID",
  page: "Page",
  limit: "Limit",
  q: "Search query",
  tag: "Tag",
};

export function translateValidationMessage(error: ValidationError): {
  field: string;
  message: string;
} {
  const path = error.instancePath.split("/").filter(Boolean);
  const params = error.params;

  const fieldName =
    error.keyword === "required" && typeof params.missingProperty === "string"
      ? ([...path, params.missingProperty].at(-1) ?? "")
      : (path[0] ?? "");

  const arrayIndex =
    path.length > 1 && /^\d+$/.test(path[1]) ? Number(path[1]) : undefined;

  const field = FIELD_LABELS[fieldName] ?? fieldName;
  let message: string;

  switch (error.keyword) {
    case "minimum":
      message = `${field} must be greater than or equal to ${params.limit}.`;
      break;

    case "maximum":
      message = `${field} must be less than or equal to ${params.limit}.`;
      break;

    case "required":
      message = `${field} is required.`;
      break;

    case "minLength":
      message =
        arrayIndex !== undefined
          ? `${field} at index ${arrayIndex} must not be empty.`
          : `${field} must be at least ${params.limit} characters long.`;
      break;

    case "maxLength":
      message = `${field} must be at most ${params.limit} characters long.`;
      break;

    case "enum":
      message = `${field} has an invalid value.`;
      break;

    case "type":
      if (error.instancePath === "" && params.type === "object") {
        message = "Request body must be a JSON object.";
      } else {
        message = `${field} has an invalid type.`;
      }
      break;

    default:
      message = `${field} is invalid.`;
  }

  return { field: fieldName, message };
}
