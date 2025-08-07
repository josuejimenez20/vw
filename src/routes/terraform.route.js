import express from 'express';
import { runTerraform, destroyTerraform } from '../controllers/terraform.controller.js';
import { getUserResources } from '../controllers/user.controller.js';

const router = express.Router();

router.post('/deploy', runTerraform);
router.post('/destroy', destroyTerraform);
router.get('/user/resources/:user_id', getUserResources);

export default router;
