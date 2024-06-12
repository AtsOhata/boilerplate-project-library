'use strict';
require('dotenv').config();

module.exports = function (app) {

  const express = require('express');
  const cors = require('cors');
  const mongoose = require('mongoose');
  mongoose.connect(process.env.DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const db = mongoose.connection;
  db.on('error', console.error.bind(console, 'connection error:'));
  db.once('open', () => {
    console.log('Connected to MongoDB');
  });

  const bookSchema = new mongoose.Schema({
    title: { type: String },
    comments: { type: Array },
  });
  const Book = mongoose.model('Book', bookSchema);

  app.route('/api/books')
    .get(async function (req, res) {
      const books = await Book.aggregate([
        {
          $project: {
            comments: 1,
            _id: 1,
            title: 1,
            commentcount: { $size: "$comments" }
          }
        }
      ]);
      res.send(books);
    })

    .post(async function (req, res) {
      let title = req.body.title;
      if (!title || title == "") {
        res.send("missing required field title");
        return;
      }
      try {
        const newBook = new Book({ title: title, comments: [], });
        const savedBook = await newBook.save();
        res.send({
          _id: savedBook._id,
          title: savedBook.title,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
    })

    .delete(async function (req, res) {
      try {
        await Book.deleteMany({});
        res.send('complete delete successful');
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
    });



  app.route('/api/books/:id')
    .get(async function (req, res) {
      let bookid = req.params.id;
      try {
        const book = await Book.aggregate([
          {
            $match: { _id: mongoose.Types.ObjectId(bookid) }
          },
          {
            $project: {
              comments: 1,
              _id: 1,
              title: 1,
              commentcount: { $size: "$comments" }
            }
          }
        ]);
        if (book.length === 0) {
          return res.send('no book exists');
        }
        res.send(book[0]);
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
    })

    .post(async function (req, res) {
      let bookid = req.params.id;
      let comment = req.body.comment;
      if (!comment || comment == "") {
        res.send("missing required field comment");
        return;
      }
      try {
        const theBook = await Book.findById(bookid);
        if (!theBook) {
          res.send("no book exists");
          return;
        }
        theBook.comments.push(comment);
        const updatedBook = await theBook.save();
        res.send({ comments: updatedBook.comments, _id: updatedBook._id, title: updatedBook.title, commentcount: updatedBook.comments.length });
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
    })

    .delete(async function (req, res) {
      let bookid = req.params.id;
      try {
        const deletedBook = await Book.findByIdAndDelete(bookid);
        if (!deletedBook) {
          res.send("no book exists");
          return;
        }
        res.send("delete successful");
      } catch (error) {
        console.log(error);
        return res.json({ error: 'could not delete', _id: bookid });
      }
    });

};
