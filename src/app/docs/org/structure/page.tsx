export default function StructurePage() {
  return (
    <div className="mx-auto max-w-3xl px-10 py-10 text-[13px] text-slate-200">
      <h1 className="mb-4 text-2xl font-semibold text-slate-50">
        How to structure your organization
      </h1>

      <div className="space-y-6">
        <section>
          <h2 className="mb-2 text-lg font-medium text-slate-100">
            Teams
          </h2>
          <p className="mb-3 text-[13px] text-slate-300">
            Teams are groups of people who collaborate daily. Teams typically represent functional groups like "Engineering", "Design", or "Sales".
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
            Departments are larger organizational units that contain multiple teams. For example, "Engineering" might be a department containing teams like "Frontend", "Backend", and "DevOps".
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
            Examples of roles include "Senior Engineer", "Product Manager", "Design Lead", etc.
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
    </div>
  );
}

