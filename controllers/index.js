'use strict'

const express = require('express')
const router = express.Router()
const fs = require('fs')
const config = require('../config')
const missions = require('./missions')
const users = require('./users')

var isAuthenticated = function (req, res, next) {
	// if user is authenticated in the session, call the next() to call the next request handler
	// Passport adds this method to request object. A middleware is allowed to add properties to
	// request and response objects
	if (req.isAuthenticated())
		return next()
	// if the user is not authenticated then redirect him to the login page
	res.redirect('/')
}

module.exports = function(passport) {

  // GET /
  router.get('/', function(req, res, next) {
    var maximumGallerySliders = 6
    return res.render('index', { showHeroIndex: Math.floor(Math.random() * (maximumGallerySliders - 0 + 1)) + 0 })
  })

  // GET /signin
  router.get('/login/facebook',
    passport.authenticate('facebook', { scope : 'email' })
  )

	// Handle the callback after facebook has authenticated the user
	router.get('/login/facebook/callback',
		passport.authenticate('facebook', {
			successRedirect: '/missions',
			failureRedirect: '/facebook-login-error'
		})
  )

	// GET /legalese
  router.get('/legalese', function(req, res, next) {
    return res.render('legalese')
  })

	// GET /missions
	// See /src/js/modules/map.js for documentation on the logic for fetching missions.
	router.get('/missions', function(req, res, next) {
		missions.getMissions(req.user, req.cookies.latitude, req.cookies.longitude, function (fetchedMissions) {
			return res.render(
				'missions',
				{
					cookies: req.cookies,
					user: req.user,
					defaultLocation: config.defaultLocation,
					missions: fetchedMissions.missions,
					allMissionsBelongToUser: fetchedMissions.allMissionsBelongToUser,
					sampleMissions: fetchedMissions.sampleMissions,
					createdMissions: fetchedMissions.createdMissions,
					joinedMissions: fetchedMissions.joinedMissions
				}
			)
		})
	})

	// POST /missions
	router.post('/missions', function (req, res, next) {
		missions.getMissions(req.user, req.cookies.latitude, req.cookies.longitude, function (fetchedMissions) {
			res.writeHead(200, {'Content-Type': 'text/json'})
			res.write(JSON.stringify(fetchedMissions))
			res.end()
		})
	})

	// GET Forwarding /missions/id to /mission/id
	router.get('/missions/:id', function(req, res, next) {
		res.redirect('/mission/'+req.params.id)
	})

	// GET /mission/new
	router.get('/mission/new', function(req, res, next) {
		if (req.user) {
			return res.render('mission-new', { cookies: req.cookies, user: req.user })
		} else {
			res.redirect('/login/facebook')
		}
	})

	// POST /mission/new
	router.post('/mission/new', function(req, res, next) {
		if (req.user) {
			missions.newMission(req.user, req.body, function (newMissionData) {
				res.writeHead(200, {'Content-Type': 'text/json'})
				res.write(JSON.stringify(newMissionData))
				res.end()
			})
		} else {
			var err = new Error('You need to signup to a free Minihero account to create missions.')
			next(err)
		}
	})

	// GET /mission/id
	router.get('/mission/:id', function(req, res, next) {
		if (req.params.id.includes('sample-')) {
			// Sample mission. Grab the JSON data.
			var sampleMissionsObject = JSON.parse(fs.readFileSync(__dirname + '/../data/sample-missions.json', 'utf8'))
			var missionId = Number(req.params.id.replace('sample-', ''))
			var sampleMission = sampleMissionsObject.sampleMissions[missionId - 1]
			return res.render(
				'mission',
				{
					cookies: req.cookies,
					user: req.user,
					defaultLocation: config.defaultLocation,
					mission: sampleMission,
					creator: sampleMission.creator,
					participants: sampleMission.participants,
					isSampleMission: true
				}
			)
		} else {
			// Real mission. Retrieve it from the database.
			missions.getMission(req.params.id, function(fetchedMission) {
				if (fetchedMission) {
					return res.render(
						'mission',
						{
							cookies: req.cookies,
							user: req.user,
							defaultLocation: config.defaultLocation,
							mission: fetchedMission.mission,
							creator: fetchedMission.creator,
							participants: fetchedMission.participants
						}
					)
				} else {
					next()
				}
			})
		}
	})

	// GET /mission/id/join
	router.get('/mission/:id/join', function(req, res, next) {
		if (req.user) {
			missions.joinMission(req.user, req.params.id, function(updated) {
				if (updated) {
					res.redirect('/mission/' + req.params.id)
				} else {
					var err = new Error('Error joining mission.')
					next(err)
				}
			})
		} else {
			res.redirect('/mission/' + req.params.id)
		}
	})

	// GET /mission/id/leave
	router.get('/mission/:id/leave', function(req, res, next) {
		if (req.user) {
			missions.leaveMission(req.user, req.params.id, function(updated) {
				if (updated) {
					res.redirect('/mission/' + req.params.id)
				} else {
					var err = new Error('Error leaving mission.')
					next(err)
				}
			})
		} else {
			res.redirect('/mission/' + req.params.id)
		}
	})

	// GET /mission/id/edit
	router.get('/mission/:id/edit', function(req, res, next) {
		if (req.user) {
			missions.getMission(req.params.id, function(fetchedMission) {
				if (fetchedMission && req.user.id === fetchedMission.creator.id) {
					return res.render(
						'mission-edit',
						{
							user: req.user,
							defaultLocation: config.defaultLocation,
							mission: fetchedMission.mission,
							creator: fetchedMission.creator
						}
					)
				} else {
					var err = new Error('The mission could not be edited.')
					next(err)
				}
			})
		} else {
			var err = new Error('You can\'t edit that mission since you are not the creator.')
			next(err)
		}
	})

	// POST /mission/id/update
	router.post('/mission/:id/update', function(req, res, next) {
		if (req.user) {
			missions.updateMission(req.user, req.body, function (updatedMissionData) {
				res.writeHead(200, {'Content-Type': 'text/json'})
				res.write(JSON.stringify(updatedMissionData))
				res.end()
			})
		} else {
			var err = new Error('You can\'t update that mission since you are not the creator.')
			next(err)
		}
	})

	// Todo: Implement
	// GET /mission/id/delete
	router.get('/mission/:id/delete', function(req, res, next) {
	})

	// GET /agree
	router.get('/agree', function(req, res, next) {
		if (req.user.agreedToTerms === true) {
			var err = new Error('You already agreed to the terms.')
	    err.status = 401
	    return next(err)
		}
		if (req.user) {
			users.markAsAgreedToTerms(req.user, function(updated) {
				res.redirect('/missions#user-agreed-terms')
			})
		} else {
	    var err = new Error('You need to be logged in to agree to terms.')
	    err.status = 401
	    return next(err)
	  }
	})

	return router
}
