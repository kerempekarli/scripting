const mongoose = require("mongoose");

const dataSchema = new mongoose.Schema({
  jobTitle: String,
  companyName: String,
  referenceNumber: String,
  language: String,
  workingHours: String,
  workplace: String,
  companySize: String,
  employmentContract: String,
  onlineSince: String,
  jobDescription: String,
  contactInfo: Object,
  addressInfo: Object,
  pageNumber: Number,
  pageIndex: Number,
});

const DataModel = mongoose.model("Job", dataSchema);

module.exports = DataModel;
