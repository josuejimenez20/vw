import express from 'express';
import { runTerraform, destroyTerraform } from '../controllers/terraform.controller.js';

const router = express.Router();

router.post('/deploy', runTerraform);
router.post('/destroy', destroyTerraform);

export default router;
