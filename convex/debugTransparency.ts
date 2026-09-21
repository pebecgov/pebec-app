import { query } from "./_generated/server";

export const listAllTransparencyItems = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("transparency_items").collect();
    return items.map(item => ({
      year: item.year,
      itemId: item.itemId,
      itemName: item.itemName,
      weight: item.weight,
      isActive: item.isActive,
      answerType: item.answerType
    }));
  }
});