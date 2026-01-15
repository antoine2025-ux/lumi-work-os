/**
 * Helpers for extracting and linking Org entities from Loopbrain answers.
 * Used by OrgAskLoopbrainPanel to show related entities and highlight mentions.
 */

export type OrgContextEntity = {
  id: string;
  type: string;
  title: string;
  summary: string | null;
};

export type OrgLinkableEntity = {
  id: string;
  type: "department" | "team" | "role" | "person";
  title: string;
  href: string;
};

/**
 * Extract linkable entities from context objects returned by the API.
 * Converts contextObjects into OrgLinkableEntity[] with proper hrefs.
 */
export function findMentionedEntities(
  contextObjects: OrgContextEntity[]
): OrgLinkableEntity[] {
  return contextObjects
    .filter((obj) => {
      const type = obj.type as OrgLinkableEntity["type"];
      return ["department", "team", "role", "person"].includes(type);
    })
    .map((obj) => {
      const type = obj.type as OrgLinkableEntity["type"];
      let href = "";

      // Derive href based on type
      if (type === "department") {
        href = `/org/departments/${obj.id}`;
      } else if (type === "team") {
        href = `/org/teams/${obj.id}`;
      } else if (type === "role") {
        href = `/org/positions/${obj.id}`;
      } else if (type === "person") {
        href = `/org/people/${obj.id}`;
      }

      return {
        id: obj.id,
        type,
        title: obj.title,
        href,
      };
    });
}

