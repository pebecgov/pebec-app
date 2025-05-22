// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { actionGeneric, httpActionGeneric, queryGeneric, mutationGeneric, internalActionGeneric, internalMutationGeneric, internalQueryGeneric } from "convex/server";
export const query = queryGeneric;
export const internalQuery = internalQueryGeneric;
export const mutation = mutationGeneric;
export const internalMutation = internalMutationGeneric;
export const action = actionGeneric;
export const internalAction = internalActionGeneric;
export const httpAction = httpActionGeneric;