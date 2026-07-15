import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { PaymentMode } from "../models/PaymentMode";

export const getPaymentModes = async (req: AuthRequest, res: Response) => {
  try {
    // Check if global payment modes exist. If not, auto-seed defaults.
    const count = await PaymentMode.countDocuments({ isGlobal: true });
    if (count === 0) {
      await PaymentMode.create([
        { name: "Cash", isGlobal: true, subPaymentModes: [] },
        { name: "UPI", isGlobal: true, subPaymentModes: [] },
        { name: "Net Banking", isGlobal: true, subPaymentModes: [] },
        { name: "Credit Card", isGlobal: true, subPaymentModes: [] },
        { name: "Debit Card", isGlobal: true, subPaymentModes: [] }
      ]);
    }

    const modes = await PaymentMode.find({
      $or: [{ user: req.user._id }, { isGlobal: true }]
    });

    // Filter subPaymentModes for the current user
    const filteredModes = modes.map(m => {
      const obj = m.toObject() as any;
      obj.subPaymentModes = obj.subPaymentModes.filter(
        (sub: any) => sub.user?.toString() === req.user._id.toString()
      );
      return obj;
    });

    res.json(filteredModes);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createPaymentMode = async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    const mode = await PaymentMode.create({ name, user: req.user._id });
    res.status(201).json(mode);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePaymentMode = async (req: AuthRequest, res: Response) => {
  try {
    const mode = await PaymentMode.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: req.body },
      { new: true }
    );
    res.json(mode);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deletePaymentMode = async (req: AuthRequest, res: Response) => {
  try {
    await PaymentMode.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ message: "Payment mode deleted" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Sub Payment Modes
export const addSubPaymentMode = async (req: AuthRequest, res: Response) => {
  try {
    const mode = await PaymentMode.findOne({ 
      _id: req.params.id, 
      $or: [{ user: req.user._id }, { isGlobal: true }] 
    });
    if (!mode) return res.status(404).json({ message: "Payment mode not found" });
    mode.subPaymentModes.push({ name: req.body.name, user: req.user._id });
    await mode.save();
    
    // Return the mode with filtered subPaymentModes for response parity
    const obj = mode.toObject() as any;
    obj.subPaymentModes = obj.subPaymentModes.filter(
      (sub: any) => sub.user?.toString() === req.user._id.toString()
    );
    res.status(201).json(obj);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSubPaymentMode = async (req: AuthRequest, res: Response) => {
  try {
    const mode = await PaymentMode.findOne({ 
      _id: req.params.modeId, 
      $or: [{ user: req.user._id }, { isGlobal: true }] 
    });
    if (!mode) return res.status(404).json({ message: "Payment mode not found" });
    const sub = (mode.subPaymentModes as any).id(req.params.subId);
    if (!sub || sub.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: "Sub payment mode not found or unauthorized" });
    }
    sub.name = req.body.name;
    await mode.save();
    
    const obj = mode.toObject() as any;
    obj.subPaymentModes = obj.subPaymentModes.filter(
      (sub: any) => sub.user?.toString() === req.user._id.toString()
    );
    res.json(obj);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteSubPaymentMode = async (req: AuthRequest, res: Response) => {
  try {
    const mode = await PaymentMode.findOne({ 
      _id: req.params.modeId, 
      $or: [{ user: req.user._id }, { isGlobal: true }] 
    });
    if (!mode) return res.status(404).json({ message: "Payment mode not found" });
    const sub = (mode.subPaymentModes as any).id(req.params.subId);
    if (!sub || sub.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: "Sub payment mode not found or unauthorized" });
    }
    sub.deleteOne();
    await mode.save();
    
    const obj = mode.toObject() as any;
    obj.subPaymentModes = obj.subPaymentModes.filter(
      (sub: any) => sub.user?.toString() === req.user._id.toString()
    );
    res.json(obj);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
