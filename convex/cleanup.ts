import { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";

export const orphanUsersAndMdas = internalMutation(async (ctx) => {
  const mdas = await ctx.db.query("mdas").collect();

  for (const mda of mdas) {
    const validAssignedUsers: Id<"users">[] = [];

    for (const userId of mda.assignedUsers) {
      const user = await ctx.db.get(userId);

      const isValid =
        user &&
        (user.role === "mda" || user.role === "reform_champion") &&
        user.mdaId?.toString() === mda._id.toString();

      if (isValid) {
        validAssignedUsers.push(userId);
      }
    }

    if (validAssignedUsers.length === 0) {
      // ❌ Delete the MDA if no valid users are left
      await ctx.db.delete(mda._id);
    } else if (validAssignedUsers.length !== mda.assignedUsers.length) {
      // ✅ Update assignedUsers if some were removed
      await ctx.db.patch(mda._id, {
        assignedUsers: validAssignedUsers,
      });
    }
  }
});
