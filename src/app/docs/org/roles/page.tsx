export default function RolesPage() {
  return (
    <div className="mx-auto max-w-3xl px-10 py-10 text-[13px] text-slate-200">
      <h1 className="mb-4 text-2xl font-semibold text-slate-50">
        Understanding roles & permissions
      </h1>

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
            Owners can create custom roles that extend the base system roles. Custom roles add specific capabilities on top of a member's base role.
          </p>
          <p className="text-[13px] text-slate-300">
            For example, you might create a "People Ops" custom role that gives members the ability to invite people and view insights, even if their base role is Member.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-slate-100">
            Permissions
          </h2>
          <p className="text-[13px] text-slate-300">
            Permissions are granular capabilities that determine what actions someone can take. When you view a member's permissions, you'll see all the capabilities they have based on their base role plus any custom role.
          </p>
        </section>
      </div>
    </div>
  );
}

