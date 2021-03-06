
import { mapGetters, mapActions } from 'vuex'
import request from 'request'
import { shell } from 'electron'

import Top from './Top'
import Sidebar from './Sidebar'
import SourcesContent from './SourcesContent'
import Book from './Book'
import AppList from './AppList'
import AuthorList from './AuthorList'
import BookViewer from './BookViewer'
import { setInterval, setTimeout } from 'timers'
import JSftp from 'jsftp'
import async from 'async'
import path from 'path'
import ListingParser from 'parse-listing'

export default {
	template: `<div :class="['main', { 'update' : update_check }]">
					<top></top>
					<sidebar v-show="toggleSourcesContent"></sidebar>
					<sources-content v-show="toggleSourcesContent"></sources-content>
					<book-viewer v-show="! toggleSourcesContent" :src="openedBookPath"></book-viewer>
					<div id="book-loader" v-show="isLoading">
						<div class="spinner">
							<div class="rect1"></div>
							<div class="rect2"></div>
							<div class="rect3"></div>
							<div class="rect4"></div>
							<div class="rect5"></div>
						</div>
					</div>
					<div class="update_check" v-show="update_check">
						<span>There are updates currently available.</span>
						<button @click="downloadUpdate"> Download Update </button>
					</div>
			</div>`,
	computed: {
		...mapGetters({
			toggleSourcesContent: 'toggleSourcesContent',
			openedBookPath: 'openedBookPath',
			isLoading: 'isLoading'
		})
	},
	data() {
		return { update_check: false }
	},
	methods: {
		// open the link on browser
		downloadUpdate() {
			let homepage = require('../../package.json').homepage
			shell.openExternal(homepage + '/releases/latest')
		},
		...mapActions({
			addAppList: 'addAppList',
			addSources: 'addSources',
		})
	},
	created() {
		this.addAppList()

		const options = {
			"host": "10.0.0.1",
			"port": 21,
			"user": "outernet",
			"pass": "outernet",
		};

		var c = new JSftp(options);

		c.on('jsftp_debug', function (eventType, data) {
			console.log('DEBUG: ', eventType);
			console.log(JSON.stringify(data, null, 2));
		});

		c.list('/mnt/downloads/Wikipedia', function (err, entries) {

			if (err) {
				return console.error(err);
			}

			function parsedEntries(err, files) {
				if (err) return console.log(err);
				var cur = 0, L = files.length;
				var checkIfDone = function () {
					cur++;
					if (cur === L) {
						console.log("all files downloaded");
					}
				};

				var getArray = [];
				files.forEach(function (file) {
					if (file.type !== '1' && path.extname(file.name) === '.html') {
						console.log(file.name);
						getArray.push(function (cb) {
							c.get(file.name, '~/assets/storage/' + file.name, function (hadErr) {
								if (hadErr) {
									console.log(hadErr)
									console.error('There was an error retrieving the file.');
								} else {
									console.log('File copied successfully!');
									checkIfDone();
								}
								cb();
							});
						});
					}
				});

				async.series(getArray);
				// console.log("Getting the list of files from FTP.");
			}
			ListingParser.parseFtpEntries(entries, parsedEntries);
		});

		localStorage.clear()
		
		try {
			request.get('https://api.github.com/repos/mtuchi/C4T-Ed/releases/latest',
				{ headers: { 'Content-Type': 'application/json', 'User-Agent': 'request' } },
				(err, res, body) => {
					let jsonBody = JSON.parse(body)

					let currentVersion = require('../../package.json').version.toString()
					if (jsonBody.tag_name) {
						let releaseVersion = jsonBody.tag_name.substr(1).toString()
						this.update_check = (currentVersion != releaseVersion)
					}
				})
		} catch (error) {
			console.log(error)
		}
	},
	components: {
		'top': Top,
		'sidebar': Sidebar,
		'sources-content': SourcesContent,
		'book-viewer': BookViewer
	}
}