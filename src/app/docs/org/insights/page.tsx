export default function InsightsPage() {
  return (
    <div className="mx-auto max-w-3xl px-10 py-10 text-[13px] text-slate-200">
      <h1 className="mb-4 text-2xl font-semibold text-slate-50">
        Understanding Org Insights
      </h1>

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
    </div>
  );
}

