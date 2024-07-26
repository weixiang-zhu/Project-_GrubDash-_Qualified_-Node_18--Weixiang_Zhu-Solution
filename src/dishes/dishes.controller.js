const path = require("path");

// Use the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

// Middleware to set request data to res.locals
function setRequestData(req, res, next) {
  const { data: { name, description, price, image_url, id } = {} } = req.body;
  const { dishId } = req.params;
  res.locals.dishData = {
    name,
    description,
    price,
    image_url,
    id,
  };
  res.locals.dishId = dishId;
  next();
}

// List handler for dishes
function list(req, res) {
  res.json({ data: dishes });
}

// Middleware to validate the dish data
function validateDish(req, res, next) {
  const { name, description, price, image_url } = res.locals.dishData;
  if (!name || name === "") {
    return next({ status: 400, message: "Dish must include a name" });
  }
  if (!description || description === "") {
    return next({ status: 400, message: "Dish must include a description" });
  }
  if (price === undefined || price <= 0 || !Number.isInteger(price)) {
    return next({ status: 400, message: "Dish must have a price that is an integer greater than 0" });
  }
  if (!image_url || image_url === "") {
    return next({ status: 400, message: "Dish must include a image_url" });
  }
  next();
}

// Middleware to check if a dish exists
function dishExists(req, res, next) {
  const { dishId } = res.locals;
  const foundDish = dishes.find((dish) => dish.id === dishId);
  if (foundDish) {
    res.locals.dish = foundDish;
    return next();
  }
  next({ status: 404, message: `Dish id not found: ${dishId}` });
}

// Middleware to validate the dish ID in the body
function validateDishId(req, res, next) {
  const { dishId } = res.locals;
  const { id } = res.locals.dishData;

  if (id && id !== dishId) {
    return next({ status: 400, message: `Dish id does not match route id. Dish: ${id}, Route: ${dishId}` });
  }

  next();
}

// Create handler for dishes
function create(req, res) {
  const { name, description, price, image_url } = res.locals.dishData;
  const newDish = {
    id: nextId(),
    name,
    description,
    price,
    image_url,
  };
  dishes.push(newDish);
  res.status(201).json({ data: newDish });
}

// Read handler for dishes
function read(req, res) {
  res.json({ data: res.locals.dish });
}

// Update handler for dishes
function update(req, res) {
  const dish = res.locals.dish;
  const { name, description, price, image_url } = res.locals.dishData;

  dish.name = name;
  dish.description = description;
  dish.price = price;
  dish.image_url = image_url;

  res.json({ data: dish });
}

module.exports = {
  list,
  create: [setRequestData, validateDish, create],
  read: [setRequestData, dishExists, read],
  update: [setRequestData, dishExists, validateDishId, validateDish, update],
};
