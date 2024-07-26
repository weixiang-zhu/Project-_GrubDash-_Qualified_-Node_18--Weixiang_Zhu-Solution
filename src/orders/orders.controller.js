// src/orders/orders.controller.js

const path = require("path");

// Use the existing orders data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

// Middleware to set request data to res.locals
function setRequestData(req, res, next) {
  const { data: { deliverTo, mobileNumber, status, dishes, id } = {} } = req.body;
  const { orderId } = req.params;
  res.locals.orderData = {
    deliverTo,
    mobileNumber,
    status,
    dishes,
    id,
  };
  res.locals.orderId = orderId;
  next();
}

// Middleware to validate the order data
function validateOrder(req, res, next) {
  const { deliverTo, mobileNumber, dishes } = res.locals.orderData;
  if (!deliverTo || deliverTo === "") {
    return next({ status: 400, message: "Order must include a deliverTo" });
  }
  if (!mobileNumber || mobileNumber === "") {
    return next({ status: 400, message: "Order must include a mobileNumber" });
  }
  if (!dishes) {
    return next({ status: 400, message: "Order must include a dish" });
  }
  if (!Array.isArray(dishes) || dishes.length === 0) {
    return next({ status: 400, message: "Order must include at least one dish" });
  }
  for (let i = 0; i < dishes.length; i++) {
    const dish = dishes[i];
    if (!dish.quantity || dish.quantity <= 0 || !Number.isInteger(dish.quantity)) {
      return next({ status: 400, message: `Dish ${i} must have a quantity that is an integer greater than 0` });
    }
  }

  next();
}

// Middleware to check if an order exists
function orderExists(req, res, next) {
  const { orderId } = res.locals;
  const foundOrder = orders.find((order) => order.id === orderId);
  if (foundOrder) {
    res.locals.order = foundOrder;
    return next();
  }
  next({ status: 404, message: `Order id not found: ${orderId}` });
}

// Middleware to validate the order ID in the body
function validateOrderId(req, res, next) {
  const { orderId } = res.locals;
  const { id } = res.locals.orderData;

  if (id && id !== orderId) {
    return next({ status: 400, message: `Order id does not match route id. Order: ${id}, Route: ${orderId}` });
  }

  next();
}

// Middleware to validate the order status
function validateOrderStatus(req, res, next) {
  const { status } = res.locals.orderData;

  if (!status || status === "") {
    return next({ status: 400, message: "Order must have a status of pending, preparing, out-for-delivery, delivered" });
  }
  const validStatuses = ["pending", "preparing", "out-for-delivery", "delivered"];
  if (!validStatuses.includes(status)) {
    return next({ status: 400, message: "Order must have a status of pending, preparing, out-for-delivery, delivered" });
  }
  if (res.locals.order.status === "delivered") {
    return next({ status: 400, message: "A delivered order cannot be changed" });
  }
  next();
}

// Middleware to validate if an order can be deleted
function validatePendingStatus(req, res, next) {
  const { status } = res.locals.order;
  if (status !== "pending") {
    return next({ status: 400, message: "An order cannot be deleted unless it is pending" });
  }
  next();
}

// List handler for orders
function list(req, res) {
  res.json({ data: orders });
}

// Create handler for orders
function create(req, res) {
  const { deliverTo, mobileNumber, status, dishes } = res.locals.orderData;
  const newOrder = {
    id: nextId(),
    deliverTo,
    mobileNumber,
    status,
    dishes,
  };
  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}

// Read handler for orders
function read(req, res) {
  res.json({ data: res.locals.order });
}

// Update handler for orders
function update(req, res) {
  const order = res.locals.order;
  const { deliverTo, mobileNumber, status, dishes } = res.locals.orderData;

  order.deliverTo = deliverTo;
  order.mobileNumber = mobileNumber;
  order.status = status;
  order.dishes = dishes;

  res.json({ data: order });
}

// Delete handler for orders
function destroy(req, res) {
  const { orderId } = res.locals;
  const index = orders.findIndex((order) => order.id === orderId);
  if (index > -1) {
    orders.splice(index, 1);
  }
  res.sendStatus(204);
}

module.exports = {
  list,
  create: [setRequestData, validateOrder, create],
  read: [setRequestData, orderExists, read],
  update: [setRequestData, orderExists, validateOrderId, validateOrderStatus, validateOrder, update],
  delete: [setRequestData, orderExists, validatePendingStatus, destroy],
};
