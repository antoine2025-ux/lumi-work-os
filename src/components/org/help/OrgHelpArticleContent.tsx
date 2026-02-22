"use client";

/**
 * Article content components for Org Help articles.
 * These are used both in the drawer and in the full doc pages.
 */

type ArticleId = "getting-started" | "roles" | "structure" | "insights";

type OrgHelpArticleContentProps = {
  articleId: ArticleId;
};

export function OrgHelpArticleContent({ articleId }: OrgHelpArticleContentProps) {
  switch (articleId) {
    case "getting-started":
      return <GettingStartedContent />;
    case "roles":
      return <RolesContent />;
    case "structure":
      return <StructureContent />;
    case "insights":
      return <InsightsContent />;
    default:
      return null;
  }
}

function GettingStartedContent() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-lg font-medium text-slate-100">
          What is Org Center?
        </h2>
        <p className="text-[13px] text-slate-300">
          Org Center is your organization&apos;s command center. It helps you manage people, structure teams and departments, assign roles, and understand how your organization is growing.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium text-slate-100">
          Getting started
        </h2>
        <ol className="list-decimal space-y-2 pl-5 text-[13px] text-slate-300">
          <li>
            <strong className="text-slate-100">Invite your team:</strong> Start by inviting people to your workspace from the People page.
          </li>
          <li>
            <strong className="text-slate-100">Create structure:</strong> Organize people into teams and departments to reflect how your organization works.
          </li>
          <li>
            <strong className="text-slate-100">Define roles:</strong> Create roles that match the responsibilities in your organization.
          </li>
          <li>
            <strong className="text-slate-100">Explore insights:</strong> Once you have people and structure, insights will automatically show trends and patterns.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium text-slate-100">
          Key pages
        </h2>
        <ul className="space-y-2 text-[13px] text-slate-300">
          <li>
            <strong className="text-slate-100">Overview:</strong> See a high-level summary of your organization.
          </li>
          <li>
            <strong className="text-slate-100">People:</strong> Manage members, invite new people, and view your team directory.
          </li>
          <li>
            <strong className="text-slate-100">Structure:</strong> Create and manage teams, departments, and roles.
          </li>
          <li>
            <strong className="text-slate-100">Org Chart:</strong> Visualize your organization&apos;s hierarchy.
          </li>
          <li>
            <strong className="text-slate-100">Insights:</strong> View analytics and trends about your organization.
          </li>
          <li>
            <strong className="text-slate-100">Activity:</strong> See a log of important changes and actions.
          </li>
          <li>
            <strong className="text-slate-100">Settings:</strong> Manage organization settings, members, and permissions.
          </li>
        </ul>
      </section>
    </div>
  );
}

function RolesContent() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-lg font-medium text-slate-100">
          System roles
        </h2>
        <p className="mb-3 text-[13px] text-slate-300">
          Every member has a base role that determines what they can do in your organization:
        </p>
        <ul className="space-y-3 text-[13px] text-slate-300">
          <li>
            <strong className="text-slate-100">Owner:</strong> Full control over the organization. Can manage all settings, delete the organization, and assign roles.
          </li>
          <li>
            <strong className="text-slate-100">Admin:</strong> Can manage people, create teams and departments, view insights, and export activity. Cannot delete the organization or change member roles.
          </li>
          <li>
            <strong className="text-slate-100">Member:</strong> Can view organization information, people, and structure. Cannot make changes or view sensitive data like insights or activity logs.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium text-slate-100">
          Custom roles
        </h2>
        <p className="mb-3 text-[13px] text-slate-300">
          Owners can create custom roles that extend the base system roles. Custom roles add specific capabilities on top of a member&apos;s base role.
        </p>
        <p className="text-[13px] text-slate-300">
          For example, you might create a &quot;People Ops&quot; custom role that gives members the ability to invite people and view insights, even if their base role is Member.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium text-slate-100">
          Permissions
        </h2>
        <p className="text-[13px] text-slate-300">
          Permissions are granular capabilities that determine what actions someone can take. When you view a member&apos;s permissions, you&apos;ll see all the capabilities they have based on their base role plus any custom role.
        </p>
      </section>
    </div>
  );
}

function StructureContent() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-lg font-medium text-slate-100">
          Teams
        </h2>
        <p className="mb-3 text-[13px] text-slate-300">
          Teams are groups of people who collaborate daily. Teams typically represent functional groups like &quot;Engineering&quot;, &quot;Design&quot;, or &quot;Sales&quot;.
        </p>
        <p className="text-[13px] text-slate-300">
          Teams can belong to departments, and people can be assigned to teams.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium text-slate-100">
          Departments
        </h2>
        <p className="mb-3 text-[13px] text-slate-300">
          Departments are larger organizational units that contain multiple teams. For example, &quot;Engineering&quot; might be a department containing teams like &quot;Frontend&quot;, &quot;Backend&quot;, and &quot;DevOps&quot;.
        </p>
        <p className="text-[13px] text-slate-300">
          Departments help organize teams into logical groups and provide a higher-level view of your organization.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium text-slate-100">
          Roles
        </h2>
        <p className="mb-3 text-[13px] text-slate-300">
          Roles define the responsibilities and expectations for positions in your organization. Roles can be assigned to people and are often associated with specific teams.
        </p>
        <p className="text-[13px] text-slate-300">
          Examples of roles include &quot;Senior Engineer&quot;, &quot;Product Manager&quot;, &quot;Design Lead&quot;, etc.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium text-slate-100">
          Best practices
        </h2>
        <ul className="space-y-2 text-[13px] text-slate-300">
          <li>• Start simple: Begin with a few teams and add structure as your organization grows.</li>
          <li>• Keep teams focused: Each team should have a clear purpose and set of responsibilities.</li>
          <li>• Use departments for scale: As you grow, departments help organize many teams.</li>
          <li>• Define roles clearly: Make sure roles reflect actual responsibilities in your organization.</li>
        </ul>
      </section>
    </div>
  );
}

function InsightsContent() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-lg font-medium text-slate-100">
          What are Insights?
        </h2>
        <p className="text-[13px] text-slate-300">
          Org Insights provide analytics and trends about your organization. They help you understand how your organization is structured, how it&apos;s growing, and where people are distributed across teams and departments.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium text-slate-100">
          Available insights
        </h2>
        <ul className="space-y-3 text-[13px] text-slate-300">
          <li>
            <strong className="text-slate-100">Headcount:</strong> Total number of people in your organization.
          </li>
          <li>
            <strong className="text-slate-100">By department:</strong> See how many people are in each department.
          </li>
          <li>
            <strong className="text-slate-100">By team:</strong> View team sizes and distribution.
          </li>
          <li>
            <strong className="text-slate-100">Role distribution:</strong> See how roles are distributed across your organization.
          </li>
          <li>
            <strong className="text-slate-100">Join trends:</strong> Track how your organization has grown over time.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium text-slate-100">
          Who can view insights?
        </h2>
        <p className="text-[13px] text-slate-300">
          Only Owners and Admins can view detailed insights. Members can see basic counts on the Overview page, but detailed analytics are restricted to maintain privacy.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium text-slate-100">
          When do insights appear?
        </h2>
        <p className="text-[13px] text-slate-300">
          Insights will appear automatically once your workspace has members, teams, and activity. The more data you have, the richer your insights will be.
        </p>
      </section>
    </div>
  );
}

