export default function GettingStartedPage() {
  return (
    <div className="mx-auto max-w-3xl px-10 py-10 text-[13px] text-slate-200">
      <h1 className="mb-4 text-2xl font-semibold text-slate-50">
        Getting started with Org Center
      </h1>

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
    </div>
  );
}

