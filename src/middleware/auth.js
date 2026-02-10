import ApiKey from "../models/Apikey.js";

export const apiAuth = async (req, res, next) => {
  const key = req.headers["x-api-key"];
  if (!key) return res.status(401).end();

  const record = await ApiKey.findOne({ key, active: true });
  if (!record) return res.status(403).end();

  req.userId = record.userId;
  next();
};

export default apiAuth;