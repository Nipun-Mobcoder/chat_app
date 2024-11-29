import * as crypto from 'crypto';

import createOrder from "../../utils/createOrder.js"
import Payment from '../../models/Payment.js';
import { getUserFromToken } from '../../utils/jwt.js';
import User from '../../models/User.js';

const paymentResolver = {
    Mutation: {
        createOrder: async (_parent: any, { amount, currency, to }: { amount: string, currency: string, to: string }, context: { token: string }) => {
            try {
                const userData: { id: string, userName: string } = await getUserFromToken(context.token);
                const user = await User.findOne({ _id: to });
                const amountInT = Number(amount);
                const order = await createOrder(amountInT, currency);
                await Payment.create({ user_id: user._id, from_id: userData.id, amount: amountInT, paymentDate: new Date(), paymentMethod: "Paytm", currency: currency ?? "INR", paymentOrderId: order.id });
                return order;
            } catch (e) {
                throw new Error(e?.message ?? "Looks like something went wrong.")
            }
        },
        verifyPayment: async (_parent: any, { razorpayOrderId, razorpayPaymentId, razorpaySignature, to }: { razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string, to: string, amount: string, currency: string }, context: { token: string }) => {
            const userData: { id: string, userName: string } = await getUserFromToken(context.token);
            const user = await User.findOne({ _id: to });
            const payment = await Payment.findOne({ paymentOrderId: razorpayOrderId });
            try {
                const sign = razorpayOrderId + '|' + razorpayPaymentId;

                const expectedSign = crypto.createHmac('sha256', process.env.KEY_SECRET)
                    .update(sign.toString())
                    .digest('hex');

                const sender = await User.findOne({ _id: userData.id });
                if (razorpaySignature === expectedSign) {
                    const addedAmount = user?.walletAmount ? user.walletAmount + payment.amount : payment.amount;
                    const subtractedAmount = sender.walletAmount - payment.amount;

                    await User.findOneAndUpdate({ _id: user._id }, { walletAmount: addedAmount }, { new: true });
                    await User.findOneAndUpdate({ _id: sender._id }, { walletAmount: subtractedAmount }, { new: true });
                    await Payment.updateOne({ _id: payment._id }, { status: "Success" });

                    return 'Payment verified successfully';
                } else {
                    await Payment.updateOne({ _id: payment._id }, { status: "Failure" });
                    throw new Error('Invalid payment signature');
                }
            } catch (e) {
                await Payment.updateOne({_id: payment._id}, { status: "Failure" });
                throw new Error(e?.message ?? "Looks like something went wrong.");
            }
        },
        paymentFailure: async (_parent: any, { paymentOrderId }: { paymentOrderId: string }, context: { token: string }) => {
            await Payment.updateOne({ paymentOrderId: paymentOrderId }, { status: "Failure" });
            return "Payment Failed."
        }
    }
}

export default paymentResolver;