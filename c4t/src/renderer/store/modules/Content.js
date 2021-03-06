import * as fs from 'fs';
import { shell } from 'electron';
import { appListDB, authorListDB } from '../../utils/db';

const actions = {
  /**
   * The book selected from the book content opens.
   * @param {string} bookPath
   */
  openBook({ rootState }, bookPath) {
    rootState.Wrapper.openedBookPath =
      `../pdfviewer/web/viewer.html?file=${bookPath}`;
    rootState.Wrapper.toggleSources = false;

    // The address of the external links clicked
    // in the book is given to the input named <externalLink>.
    try {
      document.getElementById('book-viewer-iframe').onload = () => {
        const externalLink = document
          .getElementById('book-viewer-iframe')
          .contentDocument.getElementById('externalLink');
        // Where the input named <externalLink>
        // is listened to and opened on the browser when the value changes.
        if (externalLink) {
          externalLink.onchange = () => shell.openExternal(externalLink.value);
        }
      };
    } catch (err) {
      // console.error(err);
    }
  },
  /**
   * The book selected from the book content removes.
   * @param {Object} args
   * args = { bookId, bookAuthor, bookImagePath, listId }
   */
  removeBook({ commit }, args) {
    // remove the book image.
    fs.unlink(args.bookImagePath);

    let bookCount = 0;
    appListDB.find({}, (err, lists) => {
      lists.forEach((list) => {
        list.sources.forEach((book) => {
          if (book.bookAuthor === args.bookAuthor) bookCount++;
        });
      });
      // If the book author only has this book, the author is removed.
      if (bookCount === 1) authorListDB.remove({ authorName: args.bookAuthor });
      // the book remove from the sources list.
      appListDB.update(
        { _id: args.listId },
        { $pull: { sources: { bookId: args.bookId } } },
        (err, n) => {
          console.log(n);
          // The author list and the book content are updated.
          commit('updateAuthorsList');
          commit('updateBookContents', args.listId);
          // console.log(n);
        },
      );
    });
  },
};

export default {
  actions,
};
