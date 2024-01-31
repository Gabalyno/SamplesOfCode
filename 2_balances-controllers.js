const { validationResult } = require("express-validator");

const HttpError = require("../models/http-error");
const Balance = require("../models/balance");
const User = require("../models/user");
const checkAuth = require("../middleware/check-auth");

//List
const getBalances = async (req, res, next) => {
  let balances;

  try {
    balances = await Balance.find({ userId: req.userData.userId });
  } catch (err) {
    const error = new HttpError(
      "Could not find any balance, please try again.",
      500
    );
    return next(error);
  }

  if (!balances) {
    const error = new HttpError("Could not find balances.", 404);
    return next(error);
  }

  balances.sort((a, b) => (a.date < b.date ? 1 : b.date < a.date ? -1 : 0));

  res.json({
    balances: balances.map((balance) => balance.toObject({ getters: true })),
  });
};

//Get by Id
const getBalanceById = async (req, res, next) => {
  const Id = req.params.id;
  let balance;
  try {
    balance = await Balance.findById(Id);
  } catch (err) {
    const error = new HttpError(
      "Could not find balance with this Id, please try another.",
      500
    );
    return next(error);
  }

  if (!balance) {
    const error = new HttpError(
      "Could not find balance for the provided id.",
      404
    );
    return next(error);
  }

  if (req.userData.userId !== balance.userId.toString()) {
    const error = new HttpError(
      "You are not allowed to receive this data.",
      401
    );
    return next(error);
  }

  res.json({ balance: balance.toObject({ getters: true }) });
};

//Create
const createBalance = async (req, res, next) => {
  const Errors = validationResult(req);

  if (!Errors.isEmpty()) {
    return next(new HttpError("Add valid info.", 422));
  }

  const {
    date,
    clientName,
    wallet,
    walletInvest,
    exchange,
    farming,
    lending,
    harvesting,
    offsets,
    totalBalance,
    comments,
    userId,
  } = req.body;

  const createdBalance = new Balance({
    date,
    clientName,
    wallet,
    walletInvest,
    exchange,
    farming,
    lending,
    harvesting,
    offsets,
    totalBalance,
    comments,
    userId,
  });

  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    const error = new HttpError(
      "Creating balance failed, please try again.",
      500
    );
    return next(error);
  }

  if (!user || user.userType === "newUser") {
    const error = new HttpError("Could not find user for provided id.", 404);
    return next(error);
  }

  try {
    await createdBalance.save();
  } catch (err) {
    const error = new HttpError(
      "Creating balance failed, please try again.",
      501
    );
    return next(error);
  }

  res.status(201).json({ balance: createdBalance.toObject({ getters: true }) });
};

//Update
const updateBalance = async (req, res, next) => {
  const Errors = validationResult(req);

  if (!Errors.isEmpty()) {
    return next(new HttpError("Add valid info.", 422));
  }

  const {
    date,
    clientName,
    wallet,
    walletInvest,
    exchange,
    farming,
    lending,
    harvesting,
    offsets,
    totalBalance,
    comments,
    userId,
  } = req.body;

  const Id = req.params.id;
  let balance;

  try {
    balance = await Balance.findById(Id);
  } catch (err) {
    const error = new HttpError(
      "Could not find balance with this Id, please try another.",
      500
    );
    return next(error);
  }

  if (req.userData.userId !== balance.userId.toString()) {
    const error = new HttpError(
      "You are not allowed to receive this data.",
      401
    );
    return next(error);
  }
  balance.date = date;
  balance.clientName = clientName;
  balance.wallet = wallet;
  balance.walletInvest = walletInvest;
  balance.exchange = exchange;
  balance.farming = farming;
  balance.lending = lending;
  balance.harvesting = harvesting;
  balance.offsets = offsets;
  balance.totalBalance = totalBalance;
  balance.comments = comments;
  balance.userId = userId;

  try {
    await balance.save();
  } catch (err) {
    const error = new HttpError(
      "Updating balance failed, please try again.",
      500
    );
    return next(error);
  }

  res.status(200).json({ balance: balance.toObject({ getters: true }) });
};

//Delete
const deleteBalance = async (req, res, next) => {
  const Id = req.params.id;

  let balance;

  try {
    balance = await Balance.findById(Id);
  } catch (err) {
    const error = new HttpError(
      "Could not find balance with this Id, please try another.",
      500
    );
    return next(error);
  }

  if (req.userData.userId !== balance.userId.toString()) {
    const error = new HttpError(
      "You are not allowed to receive this data.",
      401
    );
    return next(error);
  }

  try {
    await balance.remove();
  } catch (err) {
    const error = new HttpError(
      "Deleting balance failed, please try again.",
      500
    );
    return next(error);
  }

  res.status(200).json({ massage: "The balance was deleted!" });
};

exports.getBalances = getBalances;
exports.getBalanceById = getBalanceById;
exports.createBalance = createBalance;
exports.updateBalance = updateBalance;
exports.deleteBalance = deleteBalance;
