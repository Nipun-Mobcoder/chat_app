import instance from "./paymentInstance.js"

const createOrder = async (amount: number, currency: string) => {
    try {
        const order = await instance.orders.create({
                                amount,
                                currency
                            })
        return order;
    } catch (e) {
        console.log(e);
        throw new Error(e?.message ?? "Looks like something went wrong.")
    }
}

export default createOrder;