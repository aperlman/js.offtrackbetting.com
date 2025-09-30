/*

  Populate the links with JSON files with a mouseOver

  STATUS
   - I want to host this on MongoDB
     - Mongo will need access to call the json doc
     - given a meetno and date load the doc and return a summary of the races
     https://www.mongodb.com/docs/atlas/app-services/services/http-actions/http.get/
     - build the summary responses and return a json doc for the page
     - ideally - use the date YYYYmmdd as a seed so the responses
        are consistent instead of completely randomized? not sure how this works

  Given MeetNumber / YYYYmmdd to load json

  Of the Finishers look for the largest winAmount and display the 
  top horse (or dog) -- top finisher? top payout? conditions?

  Possible responses 
  (requires: horse, jockey, race and payout [switch drive for jockey for harness?])
  [jockey] rode [horse] to victory in [race], with a payout of [payout].
  [horse] and [jockey] were the talk of the track after their win in [race], which paid out [payout].
  [jockey] and [horse] put on a show in [race], winning by a nose and paying out [payout].
  [jockey] riding [horse] was the surprise winner in [race], paying out a whopping [payout].
  [jockey] and [horse] are the new dream team in horse racing after their record-breaking win in [race] achieving a payout of [payout].
  Congratulations to [jockey] for [horse]'s win in [race] was one for the ages, paying out [payout].
  [jockey] is now the hottest jockey in town after a payout of [payout] in [race] with [horse].
  [horse] is the horse to beat after their impressive win in [race], carrying [jockey] into first place with an impressive payout of [payout].
  The long shot of the day was [horse], who won [race] ridden by [jockey] with a payout of [payout].
  [horse] and [jockey] charged out of the gate in [race], neck and neck with the other horses, winning in impressive payout of [payout].
  [jockey] leaned low over [horse]'s neck, urging the horse to go faster, achieving an impressive payout of [payout] in race [race].
  Carrying [jockey], [horse] dug deep and gave it everything he had, surging ahead of the other horses to win by a nose with an impressive payout of [payout] in race [race].
  With a payout of [payout], the crowd erupted into cheers as [jockey] and [horse] crossed the finish line, claiming victory in race [race].
  In race [race], [Horse]'s win was a stunning upset, carrying [jockey] to fame and paying out a whopping [payout] to lucky bettors.
  [jockey] and [horse] are the new dream team in horse racing, and they're poised to make history after an impressive win in race [race] and a payout of [payout].
  [horse] and [jockey] charged down the stretch, neck and neck, as the crowd went wild. In the end, it was [horse] who prevailed, winning by a nose and a payout of [payout].
  [jockey] is known for their aggressive riding style, and they put it all on the line in [race]. They urged [horse] to the finish line, and they crossed it first, with a payout of [payout].
  [horse] was the long shot of the day, but he came out swinging. He led from start to finish, winning by a comfortable margin in race [race] and a payout of [payout].
  [jockey] and [horse] are a dream team. They have a perfect understanding of each other, and it showed in [race]. They worked together perfectly, and they were rewarded with a win and a payout of [payout].
  [horse] is the horse to beat. They have the speed, the stamina, and are hungry for more wins. Ridden by [jockey] in race [race], they already won [payout], and are looking to add to their total.
  Race [race] was the most exciting race of the day. The crowd was on its feet the entire time, and the horses were giving it their all. It was a close race, but in the end, it was [horse] and [jockey] who prevailed with an impressive payout of [payout].
  [Payout] was the biggest payout for the day of the track. [jockey] as showered with praise when [horse] crossed the finish line first in race [race].
  [Horse]'s win in [race] was a stunning upset, paying out a whopping [payout] to lucky bettors and adding to jockey, [jockey]'s fame.

  (requires: dog, race, payout)
  [dog] and his owner celebrated the best payout of the day at $[payout] in race [race].
  Race [race] was the best payout of the day at $[payout] with an impressive win for [dog].
  [dog] was the big winner in race [race], taking home a payout of $[payout].
  [dog] and his owner put on a show in race [race], winning by a nose and paying out $[payout].
  [dog] was the surprise winner in race [race], paying out a whopping $[payout].
  [dog] and his owner were the talk of the track after their impressive win in race [race].
  [dog]'s win in race [race] was one for the ages, paying out a record-breaking $[payout] for the day.
  Paying out $[payout], [dog] is now the greyhound to beat after his impressive win in race [race].
  The long shot of the day was [dog], who won race [race] with a payout of $[payout].
  [dog] is now the dog to beat after their dramatic win in race [race], paying out $[payout].
  The best payout of the day [$[payout]] went to [dog] in race [race] with an thrilling win.
  [Dog]'s notable payout of $[payout] after their exciting win in race [race] was the talk of the day.
  [Dog] blasted out of the trap to win race [race] by a length, paying out $[payout].
  [Dog] and his handler were the talk of the track after their spectacular win in race [race], which paid out [payout].
  [Dog] and his handler put on a show in race [race], flying down the track and winning by a length and paying out [payout].
  [Dog] was the upset winner in race [race], paying out a whopping [payout].
  Paying out [payout], [dog] and his handler are the new dream team in greyhound racing after their record-breaking win in race [race].



  */
function RaceSummary(raceDay)