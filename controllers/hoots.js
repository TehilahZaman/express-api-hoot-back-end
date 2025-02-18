const express = require("express");
const verifyToken = require("../middleware/verify-token.js");
const Hoot = require("../models/hoot.js");
const router = express.Router();

// comment routes
// user needs to be logged in to create comment so add verify token from middleware
router.post("/:hootId/comments", verifyToken, async (req, res) => {
  try {
    // append user id to comment author to ensure user is logged as author
    req.body.author = req.user._id;

    // find hoot that is the parent documnt we want to add a comment to
    const parentHoot = await Hoot.findById(req.params.hootId);

    // comments are embedded into the hoot schema
    // so we cannot use create() to make a comment, we need .push()
    // input the req.body
    // and add the comment data to the comment array inside the hoot doc
    parentHoot.comments.push(req.body);

    // then we save() comment
    await parentHoot.save();

    // now locate the newComment using it's position in the hoot.comments array
    const newComment = parentHoot.comments[parentHoot.comments.length - 1];

    // append the author property with a uer object
    newComment._doc.author = req.user;

    res.status(200).json(newComment);
    // after this make sure to update show route to populate comments
  } catch (err) {
    console.log(err);
    res.status(500).json({ err: err.message });
  }
});

// hoot routes

router.delete("/:hootId", verifyToken, async (req, res) => {
  try {
    // find hoot
    const hoot = await Hoot.findById(req.params.hootId);

    // check permission
    // hoot.autor contains the objectId of the user that created the hoot
    if (!hoot.author.equals(req.user._id)) {
      return res.status(403).send("You do not have access to delete that hoot");
    }

    // if permission exists
    // delete hoot
    const deletedHoot = await Hoot.findByIdAndDelete(req.params.hootId);

    res.status(200).json(deletedHoot);
  } catch (err) {
    console.log(err);
    res.status(500).json({ err: err.message });
  }
});

router.put("/:hootId", verifyToken, async (req, res) => {
  try {
    // find the hoot
    const hoot = await Hoot.findById(req.params.hootId);

    // check if user has permission to change hoot
    if (!hoot.author.equals(req.user._id)) {
      return res.status(403).send("You do not have access to change that hoot");
    }
    // if permission exists
    // find hoot, input req.body/new info, ensure that we return the updated document
    const updatedHoot = await Hoot.findByIdAndUpdate(
      req.params.hootId,
      req.body,
      { new: true }
    );

    // append a complete user object to the updated hoot document
    // Append req.user to the author property:
    updatedHoot._doc.author = req.user;

    res.status(200).json(updatedHoot);
  } catch (err) {
    console.log(err);
    res.status(500).json({ err: err.message });
  }
});

router.get("/:hootId", verifyToken, async (req, res) => {
  try {
    const hoot = await Hoot.findById(req.params.hootId).populate([
      "author",
      "comments.author",
    ]);
    // populate comments!

    res.status(200).json(hoot);
  } catch (err) {
    console.log(err);
    res.status(500).json({ err: err.message });
  }
});

router.get("/", verifyToken, async (req, res) => {
  try {
    const hoots = await Hoot.find({})
      // populate the author property of each hoot with a user object
      // ask or over notes on this
      .populate("author")
      // sort hoots by descending order of create at time
      .sort({ createdAt: "desc" });
    res.status(200).json(hoots);
  } catch (err) {
    console.log(err);
    res.status(500).json({ err: err.message });
  }
});

router.post("/", verifyToken, async (req, res) => {
  try {
    // make the logged in user the author of the hoot
    req.body.author = req.user._id;
    // create the hoot with the req.body
    const hoot = await Hoot.create(req.body);
    // the author only has the onjectId
    // so add the full user information
    // hoot is not just a json object but a mongoose document,
    //    ._doc is the is a per of it that holds the actual data from mongoDB
    // -- i do't understand this
    hoot._doc.author = req.user;
    // send back new hoot in status response
    res.status(201).json(hoot);
  } catch (err) {
    console.log(err);
    res.status(500).json({ err: err.message });
  }
});

module.exports = router;
