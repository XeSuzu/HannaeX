import { Schema, model } from "mongoose";

interface ITester {
  userId: string;
  addedBy: string;
  date: Date;
}

const TesterSchema = new Schema<ITester>({
  userId: { type: String, required: true, unique: true },
  addedBy: { type: String, required: true },
  date: { type: Date, default: Date.now },
});

export default model<ITester>("Tester", TesterSchema);
