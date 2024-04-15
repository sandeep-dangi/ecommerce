//copy cardModel
const mongoose = require('mongoose'); // Erase if already required

// Declare the Schema of the Mongo model
var cartSchema = new mongoose.Schema(
    {
        products: [
            {
                product: {
                   type:  mongoose.Schema.Types.ObjectId,
                    ref: "Product",
                },
                count: Number,
                color: String,
                price: Number,      // 1st +added as change
            },
        ],
        cartTotal: Number,       //2nd change
        totalAfterDiscount: Number,     //3rd added
        orderby: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
      },
      {
        timestamps: true,
      }
);

//Export the model
module.exports = mongoose.model("Cart", cartSchema);