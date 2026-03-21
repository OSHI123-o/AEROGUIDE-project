import { Router } from "express";
import { bookingLookup, flightLookup } from "../controllers/bookingController.js";
const bookingRoutes = Router();
bookingRoutes.post("/booking-lookup", bookingLookup);
bookingRoutes.post("/flight-lookup", flightLookup);
export default bookingRoutes;
