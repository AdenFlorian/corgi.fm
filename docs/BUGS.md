BUGS
====

## High
- [ ] BUG: laggy keyboard when high latency
	- can't repro
	- didn't have an issue when using VPN thru australia 400 ping
	- maybe they were talking about the time it takes to hear a sound from when you play a note?
	- that might be able to be faster, feels around 100-200 ms latency there

## Medium
- [ ] synth envelope occasionally doing a medium length attack even though attack is around 0
- [ ] midi download not respecting long rests correctly
- [ ] filters getting stuck
- [ ] changing room thru selector doesn't completely pick up new user name if changed in previous room?
- [ ] shift click drag a connector, let go of control, connector gets stuck in midair
- [ ] when hooking up reverb and changing filter to 0 it can cause a loud sound which triggers the master volume safety
- [ ] when 2 people join around same time, they spawn on top of each other
	- [ ] server should choose their position
- [ ] BUG: right click menu breaks when switching rooms?
	- can't repro

## Low
- [ ] when typing in chat, if someone leaves the input box loses focus
- [ ] when ableton is open, corgi.fm wont recognize midi keyboard

## FIXED
- [√] ECS animations break when switching rooms
- [√] midi downloading broken
	- [√] button doesn't do anything
	- [√] downloaded midi is invalid
- [√] skip note isn't going across network
- [√] cant see other people playing on keyboards
- [√] strip query params from room names when creating rooms
- [√] backspace undoes all sequencers even if not recording
- [√] options not saving correctly again
- [√] username on keyboard not showing up to date one for other users always
- [√] !!!NODE_CLICKED takes long time for infinite sequencer, check performance
	- enableUserSelectHack={false} on Draggable
- [√] 2019-03-03 When playing note on keyboard and change connection, note keeps playing on previous instrument
	- need to somehow stop those notes
	- maybe need a sourceId for each event/note?
- [√] piano roll lines on infinite sequencer are off by one
- [√] when using external midi keyboard, the octaves don't line up right
- [√] new options are getting wiped by options from localstorage
- [√] 2019-03-10 Note getting stuck when playing keyboard really fast with mouse
	- haven't been able to reproduce
- [√] 2019-03-03 Note getting stuck on when just sequencers are playing at normal speed
	- put all 4 sequencers into same synth, with default release
- [√] when a note is playing and you switch tabs, the note gets stuck as on
	- fixed in 735a86f03a9d07f1baf1d4801e7d649829f33e8b
- [√] stuck notes on 1 client and not others
	- mitigate:
		- maybe periodically check if a note is held down on client and send update to everyone if changes
	- how could this happen?
		- events getting sent or received out of order?
		- key up event not getting sent at all?
	- what's responsible for stopping notes from other users?
		- receive VIRTUAL_KEY_UP action
	- repro
		- 2 clients
- [√] stuck notes when refreshing and a song is playing
- [√] 2019-03-03 note getting stuck on when switching synth osc types
	- no scheduled voice for it in debug visual
		- maybe audio node is undefined when it shouldnt be?
		- then when it tries to stop it, its ignoring it because its undefined
		- how to debug this tho
		- not sure how to repro
		- i think its specific to switching to and from noise osc type
		- can get stuck on noise or other type
		- where are the spots in the code that this could happen
		- the voice is getting released, but .stop() isn't getting called on the source node
		- audioNode is never null, but the issue is still happening
			- meaning, there is both an osc and noise buffer at same time
				- but that should never happen
		- how am i still hearing sound if the gain was disconnected?
			- maybe it wasn't?
		- there is still a scheduledVoice, because i can change the osc type
			- how?
				- onEnded wasn't called?
				- onEnded wont be called if audioNode never stops
				- maybe its from switching osc type during release
				- [√] make sure audioNode is stopped when switching synth osc type between noise and other
				- should probably just clean up how the synth voice handles noise vs other types
