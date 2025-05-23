// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
export default {
  providers: [{
    domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
    applicationID: "convex"
  }]
};
