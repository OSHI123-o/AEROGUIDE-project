import { Router } from "express";
import { bookingLookup, flightLookup, passengerSuggest } from "../controllers/bookingController.js";
const bookingRoutes = Router();
bookingRoutes.post("/booking-lookup", bookingLookup);
bookingRoutes.post("/flight-lookup", flightLookup);
bookingRoutes.get("/passenger-suggest", passengerSuggest);
export default bookingRoutes;
